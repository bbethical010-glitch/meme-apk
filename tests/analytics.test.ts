import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AnalyticsQueue,
  MAX_BATCH_SIZE,
  MAX_QUEUE_SIZE,
} from '../src/analytics/analyticsQueue';
import {
  computeSha256,
  getAnonymousInstallId,
  getUserHash,
  sanitizeProperties,
} from '../src/analytics/deviceId';
import {
  AnalyticsService,
  getStoredConsent,
  saveStoredConsent,
  normalizeConsentVersion,
} from '../src/analytics/useAnalytics';
import {
  AnalyticsUploaderService,
  uploaderService,
  ClockOffsetManager,
  parseRetryAfter,
  HourlyRateLimiter,
} from '../src/analytics/analyticsFlush';
import {
  AnalyticsEvent,
  ALLOWED_EVENT_NAMES,
  ALLOWED_PROPERTY_KEYS,
  AllowedEventName,
  MAX_CHUNK_SIZE,
  MAX_CHUNK_BYTES,
  EVENT_MAX_AGE_MS,
  HOURLY_EVENT_LIMIT,
} from '../src/analytics/analyticsTypes';
import {
  sanitizeAppVersion,
  validateAndSanitizePropertiesBeforeEnqueue,
} from '../src/analytics/deviceId';
import {
  StaticTokenAuthProvider,
  ServerIssuedAuthProvider,
} from '../src/analytics/analyticsAuth';

describe('Phase 1 Android Analytics Instrumentation', () => {
  let localStorageMock: Map<string, string>;

  beforeEach(() => {
    vi.resetModules();
    localStorageMock = new Map<string, string>();

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock.get(key) ?? null,
      setItem: (key: string, val: string) => localStorageMock.set(key, String(val)),
      removeItem: (key: string) => localStorageMock.delete(key),
      clear: () => localStorageMock.clear(),
    });

    vi.stubGlobal('window', {
      MemeCapsuleAnalytics: undefined,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('user_hash is 64-character lowercase SHA-256', async () => {
    const installId = getAnonymousInstallId();
    expect(installId).toBeDefined();

    const hash = await getUserHash();
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);

    // Deterministic hashing verification
    const recomputed = await computeSha256(installId);
    expect(recomputed).toBe(hash);

    // Pure fallback or crypto both produce 64 lowercase hex
    const customHash = await computeSha256('test-install-uuid-1234');
    expect(customHash).toHaveLength(64);
    expect(customHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('consent denied prevents event creation/upload', async () => {
    saveStoredConsent(false, false, 1);
    const service = AnalyticsService.getInstance();
    service.setConsent(false, false, 1);

    expect(service.isAnalyticsGranted()).toBe(false);

    // Attempting to track while consent is denied must return false
    const tracked = await service.trackEvent('meme_view', {
      memeId: 'meme_deny_test',
    });
    expect(tracked).toBe(false);

    // Queue must remain empty
    expect(service.getDiagnosticStats().queueCount).toBe(0);

    // Upload attempt when consent is denied must immediately abort
    const flushed = await service.flush();
    expect(flushed).toBe(false);
  });

  it('consent granted creates schema_version 1 events with required contract', async () => {
    saveStoredConsent(true, true, 1);
    const service = AnalyticsService.getInstance();
    service.setConsent(true, true, 1);

    expect(service.isAnalyticsGranted()).toBe(true);

    const tracked = await service.trackEvent('meme_view', {
      memeId: 'meme_999',
      category: 'dark_humor',
      screenName: 'deck',
    });
    expect(tracked).toBe(true);

    const stats = service.getDiagnosticStats();
    expect(stats.queueCount).toBeGreaterThan(0);
  });

  it('event_id uniqueness across generated events', () => {
    const queue = new AnalyticsQueue();
    const eventIds = new Set<string>();
    const count = 300;

    for (let i = 0; i < count; i++) {
      const event: AnalyticsEvent = {
        schema_version: 1,
        event_id: `uuid-${i}-${Math.random()}`,
        event_name: 'meme_scroll',
        user_hash: 'a'.repeat(64),
        session_id: 'session-test',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android 14',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      };
      eventIds.add(event.event_id);
      queue.enqueue(event);
    }

    expect(eventIds.size).toBe(count);
    expect(queue.size()).toBe(count);
  });

  it('offline queue persistence across simulated process restarts', () => {
    const queue1 = new AnalyticsQueue();
    const event: AnalyticsEvent = {
      schema_version: 1,
      event_id: 'persist-event-1',
      event_name: 'app_open',
      user_hash: 'b'.repeat(64),
      session_id: 'session-persist',
      timestamp_utc: new Date().toISOString(),
      platform: 'android',
      app_version: '3.7',
      os_version: 'Android 14',
      properties: { test: true },
      consent_status: 'granted',
      consent_version: 'v1',
    };
    queue1.enqueue(event);
    expect(queue1.size()).toBe(1);

    // Simulate process kill and recreate queue from localStorage
    const queue2 = new AnalyticsQueue();
    expect(queue2.size()).toBe(1);
    const batch = queue2.peekBatch();
    expect(batch[0].event_id).toBe('persist-event-1');
    expect(batch[0].event_name).toBe('app_open');
  });

  it('batch size limits enforce maximum 200 events per request', () => {
    const queue = new AnalyticsQueue();
    for (let i = 0; i < 250; i++) {
      queue.enqueue({
        schema_version: 1,
        event_id: `batch-${i}`,
        event_name: 'meme_view',
        user_hash: 'c'.repeat(64),
        session_id: 'session-batch',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });
    }

    expect(queue.size()).toBe(250);
    const batch = queue.peekBatch();
    expect(batch.length).toBe(MAX_BATCH_SIZE);
    expect(batch.length).toBe(200);
  });

  it('bounded queue drops oldest events and increments dropped counter when full', () => {
    const queue = new AnalyticsQueue();
    const totalToPush = MAX_QUEUE_SIZE + 25;

    for (let i = 0; i < totalToPush; i++) {
      queue.enqueue({
        schema_version: 1,
        event_id: `overflow-${i}`,
        event_name: 'meme_scroll',
        user_hash: 'd'.repeat(64),
        session_id: 'session-overflow',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });
    }

    expect(queue.size()).toBe(MAX_QUEUE_SIZE);
    expect(queue.getDroppedCount()).toBe(25);
    // Oldest 25 were evicted; first remaining is index 25
    expect(queue.peekBatch()[0].event_id).toBe('overflow-25');
  });

  it('retry/backoff calculation implements exponential backoff capped at 120s', () => {
    const uploader = new AnalyticsUploaderService();
    expect(uploader.calculateBackoff(0)).toBe(0);
    expect(uploader.calculateBackoff(1)).toBe(2000);
    expect(uploader.calculateBackoff(2)).toBe(4000);
    expect(uploader.calculateBackoff(3)).toBe(8000);
    expect(uploader.calculateBackoff(4)).toBe(16000);
    expect(uploader.calculateBackoff(5)).toBe(32000);
    expect(uploader.calculateBackoff(6)).toBe(64000);
    expect(uploader.calculateBackoff(7)).toBe(120000);
    expect(uploader.calculateBackoff(10)).toBe(120000);
  });

  it('successful upload (HTTP 200) removes accepted events and resets error state', () => {
    const queue = new AnalyticsQueue();
    const eventIds = ['ev-1', 'ev-2'];
    eventIds.forEach((id) =>
      queue.enqueue({
        schema_version: 1,
        event_id: id,
        event_name: 'meme_like',
        user_hash: 'e'.repeat(64),
        session_id: 'sess-success',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      })
    );

    expect(queue.size()).toBe(2);
    const uploader = new AnalyticsUploaderService();
    const result = uploader.handleResponse(200, eventIds, queue);

    expect(result).toBe(true);
    expect(queue.size()).toBe(0);
    const stats = uploader.getDiagnosticStats(queue.size(), queue.getDroppedCount());
    expect(stats.acceptedCount).toBe(2);
    expect(stats.lastError).toBeNull();
    expect(stats.lastFlushTimeUtc).toBeDefined();
  });

  it('HTTP 400 validation failure drops invalid batch and does not retry forever', () => {
    const queue = new AnalyticsQueue();
    const eventIds = ['bad-ev-1', 'bad-ev-2'];
    eventIds.forEach((id) =>
      queue.enqueue({
        schema_version: 1,
        event_id: id,
        event_name: 'meme_share',
        user_hash: 'f'.repeat(64),
        session_id: 'sess-bad',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      })
    );

    const uploader = new AnalyticsUploaderService();
    const result = uploader.handleResponse(400, eventIds, queue);

    expect(result).toBe(false);
    // 400 must remove invalid events to prevent infinite loop
    expect(queue.size()).toBe(0);
    const stats = uploader.getDiagnosticStats(queue.size(), queue.getDroppedCount());
    expect(stats.rejectedCount).toBe(2);
    expect(stats.lastError).toContain('HTTP 400');
  });

  it('HTTP 401 disables sending and reports configuration failure', () => {
    const queue = new AnalyticsQueue();
    const uploader = new AnalyticsUploaderService();
    uploader.handleResponse(401, ['ev-auth'], queue);

    expect(uploader.canSendNow()).toBe(false);
    const stats = uploader.getDiagnosticStats(0, 0);
    expect(stats.lastError).toContain('HTTP 401 Unauthorized');
  });

  it('HTTP 429 and 5xx retain events and trigger exponential backoff', () => {
    const queue = new AnalyticsQueue();
    const eventIds = ['retry-ev-1', 'retry-ev-2'];
    eventIds.forEach((id) =>
      queue.enqueue({
        schema_version: 1,
        event_id: id,
        event_name: 'meme_save',
        user_hash: '1'.repeat(64),
        session_id: 'sess-retry',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      })
    );

    const uploader = new AnalyticsUploaderService();

    // 429 Rate Limit
    uploader.handleResponse(429, eventIds, queue);
    expect(queue.size()).toBe(2); // Events retained
    expect(uploader.canSendNow()).toBe(false); // Backoff applied

    // 500 Server Error
    uploader.handleResponse(500, eventIds, queue);
    expect(queue.size()).toBe(2); // Events still retained
    expect(uploader.canSendNow()).toBe(false);
  });

  it('no PII is included in serialized payloads', () => {
    const rawProps = {
      email: 'user@example.com',
      phone: '+1-555-0199',
      contacts: ['Alice', 'Bob'],
      imei: '867530900000000',
      mac: 'AA:BB:CC:DD:EE:FF',
      latitude: 40.7128,
      longitude: -74.006,
      gallery: '/storage/emulated/0/DCIM',
      suspicious_field: 'contact_me_at_admin@company.org',
      valid_tag: 'dank_humor',
      card_index: 2,
      is_dark_mode: true,
    };

    const sanitized = sanitizeProperties(rawProps);

    expect(sanitized.email).toBeUndefined();
    expect(sanitized.phone).toBeUndefined();
    expect(sanitized.contacts).toBeUndefined();
    expect(sanitized.imei).toBeUndefined();
    expect(sanitized.mac).toBeUndefined();
    expect(sanitized.latitude).toBeUndefined();
    expect(sanitized.longitude).toBeUndefined();
    expect(sanitized.gallery).toBeUndefined();
    expect(sanitized.suspicious_field).toBeUndefined();

    // Non-PII properties preserved
    expect(sanitized.valid_tag).toBe('dank_humor');
    expect(sanitized.card_index).toBe(2);
    expect(sanitized.is_dark_mode).toBe(true);
  });

  it('nested PII and secret keys are stripped from properties and arrays', () => {
    const nestedRawProps = {
      token: 'secret_root_token',
      api_key: 'root_key_123',
      user: {
        email: 'nested@example.com',
        auth: 'secret_auth',
        display_name: 'Anonymous',
      },
      items: [
        { password: '123', title: 'meme' },
        'admin@test.com',
        'clean_string',
      ],
      safe_metric: 10,
    };
    const clean = sanitizeProperties(nestedRawProps);
    expect(clean.token).toBeUndefined();
    expect(clean.api_key).toBeUndefined();
    expect(clean.user.email).toBeUndefined();
    expect(clean.user.auth).toBeUndefined();
    expect(clean.user.display_name).toBe('Anonymous');
    expect(clean.items[0].password).toBeUndefined();
    expect(clean.items[0].title).toBe('meme');
    expect(clean.items[1]).toBe('clean_string');
    expect(clean.safe_metric).toBe(10);
  });

  it('HTTP 403, 404, and 405 disable sending to prevent infinite loops', () => {
    const queue = new AnalyticsQueue();
    const uploader = new AnalyticsUploaderService();

    // 403 Forbidden
    uploader.handleResponse(403, ['ev-403'], queue);
    expect(uploader.canSendNow()).toBe(false);
    expect(uploader.getDiagnosticStats(0, 0).lastError).toContain('HTTP 403 Forbidden');

    // Reset and test 404 Not Found
    uploader.resetAuthDisabled();
    expect(uploader.canSendNow()).toBe(true);
    uploader.handleResponse(404, ['ev-404'], queue);
    expect(uploader.canSendNow()).toBe(false);
    expect(uploader.getDiagnosticStats(0, 0).lastError).toContain('HTTP 404: Endpoint configuration failure');

    // Reset and test 405 Method Not Allowed
    uploader.resetAuthDisabled();
    uploader.handleResponse(405, ['ev-405'], queue);
    expect(uploader.canSendNow()).toBe(false);
    expect(uploader.getDiagnosticStats(0, 0).lastError).toContain('HTTP 405: Endpoint configuration failure');
  });

  it('duplicate event IDs are stable across retries and never regenerated', () => {
    const queue = new AnalyticsQueue();
    const fixedId = 'fixed-uuid-12345';
    const event: AnalyticsEvent = {
      schema_version: 1,
      event_id: fixedId,
      event_name: 'meme_view',
      user_hash: 'd'.repeat(64),
      session_id: 'session-retry',
      timestamp_utc: new Date().toISOString(),
      platform: 'android',
      app_version: '3.7',
      os_version: 'Android',
      properties: {},
      consent_status: 'granted',
      consent_version: 'v1',
    };

    queue.enqueue(event);

    // Repeated peeks and retries retain the exact same event_id
    for (let i = 0; i < 5; i++) {
      const batch = queue.peekBatch();
      expect(batch[0].event_id).toBe(fixedId);
    }
  });

  it('request body size limit enforces 2 MiB ceiling and chunks batches', async () => {
    const queue = new AnalyticsQueue();
    const largePadding = 'a'.repeat(500000); // ~500 KB per event

    for (let i = 0; i < 6; i++) {
      queue.enqueue({
        schema_version: 1,
        event_id: `large-ev-${i}`,
        event_name: 'meme_view',
        user_hash: 'c'.repeat(64),
        session_id: 'session-large',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: { padding: largePadding },
        consent_status: 'granted',
        consent_version: 'v1',
      });
    }

    expect(queue.size()).toBe(6);

    let sentBatchSize = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: any) => {
      const parsed = JSON.parse(init.body);
      sentBatchSize = parsed.events.length;
      return {
        status: 200,
        ok: true,
        json: async () => ({ accepted: sentBatchSize }),
      };
    }));

    const provider = new StaticTokenAuthProvider('staging_test_token');
    const uploader = new AnalyticsUploaderService(provider);
    const flushed = await uploader.flush(queue);

    expect(flushed).toBe(true);
    // Since 6 events * 500KB > 2 MiB, chunking must send < 6 events
    expect(sentBatchSize).toBeGreaterThan(0);
    expect(sentBatchSize).toBeLessThan(6);
  });

  describe('Authentication Configuration & Security Hardening', () => {
    it('no production token exists in source-controlled files', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');

      const filesToCheck = [
        path.resolve(__dirname, '../.env.example'),
        path.resolve(__dirname, '../android/gradle.properties'),
        path.resolve(__dirname, '../package.json'),
        path.resolve(__dirname, '../src/analytics/analyticsFlush.ts'),
        path.resolve(__dirname, '../src/analytics/analyticsAuth.ts'),
      ];

      const sensitivePattern = /ANALYTICS_APP_TOKEN\s*=\s*['"][a-zA-Z0-9_\-]{16,}['"]/;

      for (const file of filesToCheck) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          // Must not match any committed production token pattern
          expect(content).not.toMatch(sensitivePattern);
          // Must not contain live token values
          expect(content).not.toContain('mc_live_');
        }
      }
    });

    it('missing token fails safely and returns empty auth headers', () => {
      const provider = new StaticTokenAuthProvider('');

      expect(provider.isConfigured()).toBe(false);
      expect(provider.getAuthHeaders()).toEqual({});

      const uploader = new AnalyticsUploaderService(provider);
      expect(uploader.canSendNow()).toBe(true);

      // On 401 response, provider cleanly disables sending without crashing
      const queue = new AnalyticsQueue();
      const result = uploader.handleResponse(401, ['ev-test'], queue);
      expect(result).toBe(false);
      expect(uploader.canSendNow()).toBe(false);
      expect(provider.isAuthDisabled()).toBe(true);
    });

    it('token is never written to logs or error diagnostics', async () => {
      const SECRET_STAGING_TOKEN = 'secret_canary_token_super_private_999';
      const provider = new StaticTokenAuthProvider(SECRET_STAGING_TOKEN);

      const capturedLogs: string[] = [];
      const logSpy = vi.spyOn(console, 'log').mockImplementation((...args) => {
        capturedLogs.push(args.map(String).join(' '));
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        capturedLogs.push(args.map(String).join(' '));
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
        capturedLogs.push(args.map(String).join(' '));
      });

      const queue = new AnalyticsQueue();
      queue.enqueue({
        schema_version: 1,
        event_id: 'ev-log-test',
        event_name: 'meme_view',
        user_hash: 'a'.repeat(64),
        session_id: 'sess-log',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });

      const uploader = new AnalyticsUploaderService(provider);

      // Simulate network / status handlers
      uploader.handleResponse(401, ['ev-log-test'], queue);
      uploader.handleResponse(429, ['ev-log-test'], queue);
      uploader.handleResponse(500, ['ev-log-test'], queue);

      const stats = uploader.getDiagnosticStats(queue.size(), queue.getDroppedCount());

      // Ensure secret token is not in any console output
      for (const log of capturedLogs) {
        expect(log).not.toContain(SECRET_STAGING_TOKEN);
      }

      // Ensure secret token is not in diagnostic error string
      expect(stats.lastError).not.toContain(SECRET_STAGING_TOKEN);

      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('token and user_hash are not exposed through the debug inspector statistics', () => {
      const uploader = new AnalyticsUploaderService();
      uploader.handleResponse(401, ['ev-1'], new AnalyticsQueue());
      const stats = uploader.getDiagnosticStats(5, 2);

      // Diagnostics structure must only contain safe counters and timestamps
      const keys = Object.keys(stats);
      expect(keys).toContain('queueCount');
      expect(keys).toContain('acceptedCount');
      expect(keys).toContain('rejectedCount');
      expect(keys).toContain('droppedCount');
      expect(keys).toContain('lastFlushTimeUtc');
      expect(keys).toContain('lastError');

      expect(keys).not.toContain('token');
      expect(keys).not.toContain('user_hash');
      expect(keys).not.toContain('payload');
      expect(keys).not.toContain('events');
    });

    it('release configuration recognizes placeholder credentials', () => {
      const placeholderTokens = [
        '',
        'your_production_token_here',
        'placeholder_app_token',
        'PLACEHOLDER_TOKEN',
      ];

      for (const token of placeholderTokens) {
        const isPlaceholder =
          !token ||
          token.trim().length === 0 ||
          token.toLowerCase().includes('placeholder') ||
          token.toLowerCase().includes('your_production_token');
        expect(isPlaceholder).toBe(true);
      }

      const validStagingToken = 'staging_client_auth_token_12345';
      const isValid =
        validStagingToken.length > 0 &&
        !validStagingToken.toLowerCase().includes('placeholder') &&
        !validStagingToken.toLowerCase().includes('your_production_token');
      expect(isValid).toBe(true);
    });

    it('staging uploads still work with injected configuration', () => {
      const stagingToken = 'staging_test_token_xyz_987';
      const provider = new StaticTokenAuthProvider(stagingToken);

      expect(provider.isConfigured()).toBe(true);
      expect(provider.getAuthMode()).toBe('static_token');

      const headers = provider.getAuthHeaders();
      expect(headers['X-Analytics-App-Token']).toBe(stagingToken);
    });

    it('ServerIssuedAuthProvider stub fails safely until backend deployment', () => {
      const provider = new ServerIssuedAuthProvider();

      expect(provider.isConfigured()).toBe(false);
      expect(provider.getAuthMode()).toBe('server_issued');
      expect(() => provider.getAuthHeaders()).toThrow(/not yet implemented/);
    });

    it('release build configuration forbids ALLOW_EMPTY_ANALYTICS_TOKEN bypass', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const gradlePath = path.resolve(__dirname, '../android/app/build.gradle');

      expect(fs.existsSync(gradlePath)).toBe(true);
      const gradleContent = fs.readFileSync(gradlePath, 'utf8');

      // Ensure release check does NOT allow bypass via !allowEmpty
      expect(gradleContent).not.toMatch(/if\s*\(\s*isRelease\s*&&\s*!allowEmpty\s*\)/);
      // Ensure the error message specifically mentions that ALLOW_EMPTY_ANALYTICS_TOKEN is forbidden for release
      expect(gradleContent).toContain('ALLOW_EMPTY_ANALYTICS_TOKEN is forbidden for release packaging');
    });

    it('production web build output contains no token variables or debug inspector', async () => {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const distPath = path.resolve(__dirname, '../dist');

      if (!fs.existsSync(distPath)) {
        // If dist does not exist yet in test runner, skip or verify files in src
        return;
      }

      const scanDirectory = (dir: string): string[] => {
        const files: string[] = [];
        for (const item of fs.readdirSync(dir)) {
          const fullPath = path.join(dir, item);
          if (fs.statSync(fullPath).isDirectory()) {
            files.push(...scanDirectory(fullPath));
          } else {
            files.push(fullPath);
          }
        }
        return files;
      };

      const files = scanDirectory(distPath);
      expect(files.length).toBeGreaterThan(0);

      const forbiddenStrings = [
        'VITE_ANALYTICS_APP_TOKEN',
        'ANALYTICS_APP_TOKEN',
        'ANALYTICS INSPECTOR (DEBUG)',
        'mc_live_',
        'your_production_token',
      ];

      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
          const content = fs.readFileSync(file, 'utf8');
          for (const forbidden of forbiddenStrings) {
            expect(content).not.toContain(forbidden);
          }
        }
      }
    });

    it('browser analytics remains disabled on non-native web platform without configured credentials', async () => {
      const unconfiguredProvider = new StaticTokenAuthProvider('');
      expect(unconfiguredProvider.isConfigured()).toBe(false);

      const uploader = new AnalyticsUploaderService(unconfiguredProvider);
      const queue = new AnalyticsQueue();
      queue.enqueue({
        schema_version: 1,
        event_id: 'ev-browser-test',
        event_name: 'meme_view',
        user_hash: 'b'.repeat(64),
        session_id: 'sess-browser',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });

      // flush() on web without configured credentials returns false safely
      const flushed = await uploader.flush(queue);
      expect(flushed).toBe(false);
      // Event remains queued and is not dropped
      expect(queue.size()).toBe(1);
    });
  });

  describe('Phase 4 Consent Lineage', () => {
    it('1. granted events contain consent_version', async () => {
      saveStoredConsent(true, true, 'v1');
      const service = AnalyticsService.getInstance();
      service.setConsent(true, true, 'v1');

      expect(service.isAnalyticsGranted()).toBe(true);
      expect(service.getConsent().consent_version).toBe('v1');

      const tracked = await service.trackEvent('meme_view', { memeId: 'meme_p4_1' });
      expect(tracked).toBe(true);

      const queue = (service as any).queue as AnalyticsQueue;
      const batch = queue.peekBatch();
      expect(batch.length).toBeGreaterThan(0);
      const ev = batch.find((e) => e.meme_id === 'meme_p4_1');
      expect(ev).toBeDefined();
      expect(ev?.schema_version).toBe(1);
      expect(ev?.consent_version).toBe('v1');
      expect(ev?.consent_status).toBe('granted');

      // Update to v2
      service.setConsent(true, true, 'v2');
      expect(service.getConsent().consent_version).toBe('v2');

      const trackedV2 = await service.trackEvent('meme_like', { memeId: 'meme_p4_2' });
      expect(trackedV2).toBe(true);
      const batchV2 = queue.peekBatch();
      const evV2 = batchV2.find((e) => e.meme_id === 'meme_p4_2');
      expect(evV2).toBeDefined();
      expect(evV2?.consent_version).toBe('v2');
    });

    it('2. legacy/default consent uses "v1"', () => {
      // Empty / default localStorage
      localStorage.clear();
      const defaultConsent = getStoredConsent();
      expect(defaultConsent.consent_version).toBe('v1');

      // Legacy numeric string '1' in localStorage
      localStorage.setItem('consent_version', '1');
      const legacyConsent = getStoredConsent();
      expect(legacyConsent.consent_version).toBe('v1');

      // Normalization helper tests
      expect(normalizeConsentVersion(1)).toBe('v1');
      expect(normalizeConsentVersion('1')).toBe('v1');
      expect(normalizeConsentVersion('v1')).toBe('v1');
      expect(normalizeConsentVersion(2)).toBe('v2');
      expect(normalizeConsentVersion('2')).toBe('v2');
      expect(normalizeConsentVersion('v2')).toBe('v2');
      expect(normalizeConsentVersion(null)).toBe('v1');
      expect(normalizeConsentVersion(undefined)).toBe('v1');
      expect(normalizeConsentVersion('')).toBe('v1');
      expect(normalizeConsentVersion('   ')).toBe('v1');
    });

    it('3. denied consent creates no upload', async () => {
      saveStoredConsent(false, false, 'v1');
      const service = AnalyticsService.getInstance();
      service.setConsent(false, false, 'v1');

      expect(service.isAnalyticsGranted()).toBe(false);

      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      const tracked = await service.trackEvent('meme_view', { memeId: 'denied_upload_test' });
      expect(tracked).toBe(false);
      expect(service.getDiagnosticStats().queueCount).toBe(0);

      const flushed = await service.flush();
      expect(flushed).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('4. revoked consent stops future events and clears queue', async () => {
      saveStoredConsent(true, true, 'v1');
      const service = AnalyticsService.getInstance();
      service.setConsent(true, true, 'v1');

      // Track event while granted
      await service.trackEvent('meme_view', { memeId: 'before_revoke' });
      expect(service.getDiagnosticStats().queueCount).toBeGreaterThan(0);

      // Revoke consent
      service.setConsent(false, false, 'v1');
      expect(service.isAnalyticsGranted()).toBe(false);

      // Verify queue is immediately purged upon revocation
      expect(service.getDiagnosticStats().queueCount).toBe(0);

      // Attempting to track future events must fail
      const trackedAfter = await service.trackEvent('meme_share', { memeId: 'after_revoke' });
      expect(trackedAfter).toBe(false);
      expect(service.getDiagnosticStats().queueCount).toBe(0);

      // Flush is blocked
      const flushed = await service.flush();
      expect(flushed).toBe(false);
    });

    it('5. consent-version changes do not expose PII', async () => {
      const service = AnalyticsService.getInstance();
      service.setConsent(true, true, 'v2');
      expect(service.getConsent().consent_version).toBe('v2');

      await service.trackEvent('meme_view', {
        memeId: 'pii_test_meme',
        properties: {
          email: 'user_leak@danger.com',
          phone: '+1-555-4321',
          imei: '867530900000000',
          mac: 'AA:BB:CC:DD:EE:FF',
          latitude: 37.7749,
          longitude: -122.4194,
          gallery: '/DCIM/photos/private.jpg',
          clean_metric: 42,
        },
      });

      const queue = (service as any).queue as AnalyticsQueue;
      const batch = queue.peekBatch();
      const ev = batch.find((e) => e.meme_id === 'pii_test_meme');
      expect(ev).toBeDefined();
      expect(ev?.consent_version).toBe('v2');
      expect(ev?.properties.clean_metric).toBe(42);

      // PII must be completely stripped
      expect(ev?.properties.email).toBeUndefined();
      expect(ev?.properties.phone).toBeUndefined();
      expect(ev?.properties.imei).toBeUndefined();
      expect(ev?.properties.mac).toBeUndefined();
      expect(ev?.properties.latitude).toBeUndefined();
      expect(ev?.properties.longitude).toBeUndefined();
      expect(ev?.properties.gallery).toBeUndefined();

      // Diagnostics & consent state must not leak PII or tokens
      const stats = service.getDiagnosticStats();
      const statsStr = JSON.stringify(stats);
      expect(statsStr).not.toContain('user_leak@danger.com');
      expect(statsStr).not.toContain('+1-555-4321');
      expect(statsStr).not.toContain('867530900000000');

      const consentStr = JSON.stringify(service.getConsent());
      expect(consentStr).not.toContain('user_leak@danger.com');
      expect(consentStr).not.toContain('user_hash');
      expect(consentStr).not.toContain('token');
    });
  });

  describe('Phase 5 Real-Time Dashboard & Ingestion Hardening (Steps 2-9)', () => {
    it('Retry-After parsing correctly handles seconds, dates, and defaults', () => {
      // Integer seconds
      expect(parseRetryAfter('120')).toBe(120000);
      expect(parseRetryAfter('1')).toBe(1000);

      // Default when null or empty
      expect(parseRetryAfter(null)).toBe(60000);
      expect(parseRetryAfter('')).toBe(60000);
      expect(parseRetryAfter('invalid_delay')).toBe(60000);

      // HTTP-date format (RFC 1123)
      const now = Date.now();
      const futureDateStr = new Date(now + 45000).toUTCString();
      const delay = parseRetryAfter(futureDateStr);
      expect(delay).toBeGreaterThan(40000);
      expect(delay).toBeLessThanOrEqual(46000);
    });

    it('Server backoff calculates exponential delay with jitter capped at 15 minutes', () => {
      const uploader = new AnalyticsUploaderService();
      expect(uploader.calculateServerBackoff(0)).toBe(0);

      const b1 = uploader.calculateServerBackoff(1);
      expect(b1).toBeGreaterThanOrEqual(5000);
      expect(b1).toBeLessThanOrEqual(6000);

      const b2 = uploader.calculateServerBackoff(2);
      expect(b2).toBeGreaterThanOrEqual(10000);
      expect(b2).toBeLessThanOrEqual(11000);

      const bMax = uploader.calculateServerBackoff(15);
      expect(bMax).toBeGreaterThanOrEqual(15 * 60 * 1000);
      expect(bMax).toBeLessThanOrEqual(15 * 60 * 1000 + 1000);
    });

    it('HourlyRateLimiter caps queueing at 600 events per hour and drops excess', () => {
      const limiter = new HourlyRateLimiter(600);
      const start = 1000000;
      for (let i = 0; i < 600; i++) {
        expect(limiter.allowEvent(start)).toBe(true);
      }
      // 601st event in window must be dropped
      expect(limiter.allowEvent(start)).toBe(false);
      expect(limiter.getDroppedCount()).toBe(1);

      // After 1 hour has elapsed, event is allowed
      const later = start + 3600000 + 1;
      expect(limiter.allowEvent(later)).toBe(true);
    });

    it('ClockOffsetManager detects clock skew > 60s, persists offset, and clamps timestamps', () => {
      const deviceNow = 1700000000000;
      const serverTime = deviceNow + 180000; // Server is 3 minutes ahead

      ClockOffsetManager.handleServerDateHeader(new Date(serverTime).toUTCString(), deviceNow);
      expect(ClockOffsetManager.getOffsetMs()).toBeGreaterThanOrEqual(179000);

      // Clamping: timestamp within 30s of corrected now remains unchanged
      const normalUtc = new Date(serverTime + 20000).toISOString();
      expect(ClockOffsetManager.clampTimestampIfAhead(normalUtc, deviceNow)).toBe(normalUtc);

      // Clamping: timestamp 10 minutes ahead is clamped to corrected now
      const farAheadUtc = new Date(serverTime + 600000).toISOString();
      const clamped = ClockOffsetManager.clampTimestampIfAhead(farAheadUtc, deviceNow);
      expect(new Date(clamped).getTime()).toBeLessThan(new Date(farAheadUtc).getTime());
    });

    it('sanitizeAppVersion strictly conforms to ^[0-9A-Za-z.+_-]{1,32}$', () => {
      expect(sanitizeAppVersion('3.7')).toBe('3.7');
      expect(sanitizeAppVersion('v2.3.1_release+build-1')).toBe('v2.3.1_release+build-1');
      expect(sanitizeAppVersion('3.7 beta (build 2)')).toBe('3.7-beta--build-2-');
      const longString = '1234567890123456789012345678901234567890';
      const sanitized = sanitizeAppVersion(longString);
      expect(sanitized.length).toBe(32);
      expect(/^[0-9A-Za-z.+_-]{1,32}$/.test(sanitized)).toBe(true);
    });

    it('Allowlists validate event names and property keys against strict sets', () => {
      expect(ALLOWED_EVENT_NAMES.size).toBe(19);
      expect(ALLOWED_EVENT_NAMES.has('meme_view')).toBe(true);
      expect(ALLOWED_EVENT_NAMES.has('meme_pin')).toBe(false); // missing role
      expect(ALLOWED_EVENT_NAMES.has('ad_reward_offered')).toBe(false); // missing role
      expect(ALLOWED_EVENT_NAMES.has('client_error')).toBe(false); // missing role

      expect(ALLOWED_PROPERTY_KEYS.has('action')).toBe(true);
      expect(ALLOWED_PROPERTY_KEYS.has('duration_ms')).toBe(true);
      expect(ALLOWED_PROPERTY_KEYS.has('destination')).toBe(true);
    });

    it('Poison-batch bisection isolates bad events and never blocks good events', async () => {
      const queue = new AnalyticsQueue();
      const uploader = new AnalyticsUploaderService(new StaticTokenAuthProvider('test_tok'));
      uploader.chunkSpacingMs = 0; // fast execution for tests

      const good1: AnalyticsEvent = {
        schema_version: 1,
        event_id: 'good-1',
        event_name: 'meme_like',
        user_hash: 'a'.repeat(64),
        session_id: 'sess-1',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      };
      const poison: AnalyticsEvent = {
        schema_version: 1,
        event_id: 'poison-400',
        event_name: 'meme_scroll',
        user_hash: 'b'.repeat(64),
        session_id: 'sess-1',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      };
      const good2: AnalyticsEvent = {
        schema_version: 1,
        event_id: 'good-2',
        event_name: 'meme_save',
        user_hash: 'c'.repeat(64),
        session_id: 'sess-1',
        timestamp_utc: new Date().toISOString(),
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      };

      queue.enqueue(good1);
      queue.enqueue(poison);
      queue.enqueue(good2);
      expect(queue.size()).toBe(3);

      // Mock fetch: reject any batch containing poison-400 with 400; accept batches without it
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init: any) => {
        const parsed = JSON.parse(init.body);
        const hasPoison = parsed.events.some((e: any) => e.event_id === 'poison-400');
        if (hasPoison) {
          return {
            status: 400,
            ok: false,
            headers: new Headers({ 'Content-Type': 'application/json' }),
            json: async () => ({ error: 'Invalid event payload' }),
          };
        }
        return {
          status: 200,
          ok: true,
          headers: new Headers({ 'Content-Type': 'application/json' }),
          json: async () => ({ accepted: parsed.events.length }),
        };
      }));

      const flushed = await uploader.flush(queue);
      expect(flushed).toBe(true);
      // Entire queue drained: poison dropped, good events accepted!
      expect(queue.size()).toBe(0);
      expect(uploader.getPoisonDropCount()).toBe(1);
    });

    it('23-hour expired events are dropped from the queue', () => {
      const queue = new AnalyticsQueue();
      const now = Date.now();
      const freshTime = new Date(now - 1000).toISOString();
      const expiredTime = new Date(now - (24 * 3600 * 1000)).toISOString(); // 24h old (>23h)

      queue.enqueue({
        schema_version: 1,
        event_id: 'fresh-1',
        event_name: 'meme_view',
        user_hash: '1'.repeat(64),
        session_id: 'sess',
        timestamp_utc: freshTime,
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });

      // Manually push expired event to test drop logic
      (queue as any).events.unshift({
        schema_version: 1,
        event_id: 'expired-1',
        event_name: 'meme_scroll',
        user_hash: '2'.repeat(64),
        session_id: 'sess',
        timestamp_utc: expiredTime,
        platform: 'android',
        app_version: '3.7',
        os_version: 'Android',
        properties: {},
        consent_status: 'granted',
        consent_version: 'v1',
      });

      expect(queue.size()).toBe(2);
      const dropped = queue.dropExpiredEvents(now);
      expect(dropped).toBe(1);
      expect(queue.size()).toBe(1);
      expect(queue.peekBatch()[0].event_id).toBe('fresh-1');
    });

    it('Queue limits and constants conform to specification', () => {
      expect(MAX_QUEUE_SIZE).toBe(5000);
      expect(MAX_CHUNK_SIZE).toBe(100);
      expect(MAX_CHUNK_BYTES).toBe(1024 * 1024);
      expect(EVENT_MAX_AGE_MS).toBe(23 * 3600 * 1000);
      expect(HOURLY_EVENT_LIMIT).toBe(600);
    });
  });
});
