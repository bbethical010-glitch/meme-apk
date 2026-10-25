import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AllowedEventName,
  ALLOWED_EVENT_NAMES,
  AnalyticsEvent,
  ConsentState,
  DiagnosticStats,
} from './analyticsTypes';
import {
  getUserHash,
  sanitizeProperties,
  sanitizeAppVersion,
  validateAndSanitizePropertiesBeforeEnqueue,
} from './deviceId';
import { AnalyticsQueue } from './analyticsQueue';
import {
  uploaderService,
  ClockOffsetManager,
  HourlyRateLimiter,
} from './analyticsFlush';

declare global {
  interface Window {
    MemeCapsuleAnalytics?: {
      trackEvent: (
        eventName: string,
        memeId: string,
        category: string,
        screenName: string,
        sourceChannel: string,
        propertiesJson: string
      ) => void;
      setConsent: (
        analyticsGranted: boolean,
        advertisingGranted: boolean,
        version: string | number,
        timestampUtc: string
      ) => void;
      getConsentState: () => string;
      getDiagnosticStats: () => string;
      flushQueue: () => void;
      clearQueue: () => void;
    };
  }
}

const STORAGE_ANALYTICS_CONSENT = 'analytics_consent';
const STORAGE_ADVERTISING_CONSENT = 'advertising_consent';
const STORAGE_CONSENT_VERSION = 'consent_version';
const STORAGE_CONSENT_TIMESTAMP = 'consent_timestamp_utc';

export function normalizeConsentVersion(version?: string | number | null): string {
  if (version === undefined || version === null) {
    return 'v1';
  }
  const str = String(version).trim().toLowerCase();
  if (!str) {
    return 'v1';
  }
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return num > 0 ? `v${num}` : 'v1';
  }
  if (/^v\d+$/.test(str)) {
    return str;
  }
  return 'v1';
}

export function getStoredConsent(): ConsentState {
  if (typeof localStorage === 'undefined') {
    return {
      analytics_consent: 'denied',
      advertising_consent: 'denied',
      consent_version: 'v1',
      consent_timestamp_utc: '',
    };
  }
  const analytics = localStorage.getItem(STORAGE_ANALYTICS_CONSENT) === 'granted' ? 'granted' : 'denied';
  const advertising = localStorage.getItem(STORAGE_ADVERTISING_CONSENT) === 'granted' ? 'granted' : 'denied';
  const rawVersion = localStorage.getItem(STORAGE_CONSENT_VERSION);
  const version = normalizeConsentVersion(rawVersion);
  const timestamp = localStorage.getItem(STORAGE_CONSENT_TIMESTAMP) || '';

  return {
    analytics_consent: analytics,
    advertising_consent: advertising,
    consent_version: version,
    consent_timestamp_utc: timestamp,
  };
}

export function saveStoredConsent(
  analytics: boolean,
  advertising: boolean,
  version: string | number = 'v1'
): ConsentState {
  const timestamp = new Date().toISOString();
  const normalizedVersion = normalizeConsentVersion(version);
  const consent: ConsentState = {
    analytics_consent: analytics ? 'granted' : 'denied',
    advertising_consent: advertising ? 'granted' : 'denied',
    consent_version: normalizedVersion,
    consent_timestamp_utc: timestamp,
  };

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_ANALYTICS_CONSENT, consent.analytics_consent);
    localStorage.setItem(STORAGE_ADVERTISING_CONSENT, consent.advertising_consent);
    localStorage.setItem(STORAGE_CONSENT_VERSION, normalizedVersion);
    localStorage.setItem(STORAGE_CONSENT_TIMESTAMP, timestamp);
  }

  // Sync to native bridge if present
  if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
    window.MemeCapsuleAnalytics.setConsent(analytics, advertising, normalizedVersion, timestamp);
  }

  return consent;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private queue: AnalyticsQueue;
  private sessionId: string;
  private userHash: string | null = null;
  private consent: ConsentState;
  private isSessionActive = false;

  private lastViewedMemeId: string | null = null;
  private lastBackgroundTimestampMs = 0;
  private hourlyRateLimiter = new HourlyRateLimiter();
  private debounceTimer: any = null;
  private foregroundTimer: any = null;
  private isForeground = true;

  public static readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.queue = new AnalyticsQueue();
    this.sessionId = this.generateUuid();
    this.consent = getStoredConsent();
    this.initUserHash();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async initUserHash(): Promise<void> {
    try {
      this.userHash = await getUserHash();
    } catch {
      this.userHash = null;
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getConsent(): ConsentState {
    this.consent = getStoredConsent();
    return this.consent;
  }

  public setConsent(analytics: boolean, advertising: boolean, version: string | number = 'v1'): void {
    this.consent = saveStoredConsent(analytics, advertising, version);
    if (!analytics) {
      // Consent denial / revocation: purge events immediately & stop timers
      this.queue.clear();
      this.stopTimers();
      this.hourlyRateLimiter.reset();
      if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
        window.MemeCapsuleAnalytics.clearQueue();
      }
    } else {
      uploaderService.resetAuthDisabled();
    }
  }

  public isAnalyticsGranted(): boolean {
    return this.getConsent().analytics_consent === 'granted';
  }

  public ensureForegroundTimer(): void {
    if (!this.isForeground || this.queue.size() === 0 || this.foregroundTimer) {
      return;
    }
    // Foreground cadence: 20s + 0 to 5s jitter
    const delay = 20000 + Math.floor(Math.random() * 5000);
    this.foregroundTimer = setTimeout(async () => {
      this.foregroundTimer = null;
      if (this.isForeground && this.queue.size() > 0) {
        await this.flush();
      }
      if (this.isForeground && this.queue.size() > 0) {
        this.ensureForegroundTimer();
      }
    }, delay);
  }

  public triggerDebouncedFlush(delayMs = 2000): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flush();
    }, delayMs);
  }

  public stopTimers(): void {
    if (this.foregroundTimer) {
      clearTimeout(this.foregroundTimer);
      this.foregroundTimer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  public onAppForeground(): void {
    this.isForeground = true;
    const now = Date.now();
    // 30 min background threshold for session continuity
    if (this.lastBackgroundTimestampMs > 0 && (now - this.lastBackgroundTimestampMs) > AnalyticsService.SESSION_TIMEOUT_MS) {
      this.startSession();
    }
    if (this.queue.size() > 0) {
      this.ensureForegroundTimer();
    }
  }

  public onAppBackground(): void {
    this.isForeground = false;
    this.lastBackgroundTimestampMs = Date.now();
    this.stopTimers();
    this.trackEvent('app_background', { screenName: 'app' });
    this.flush();
  }

  public async trackEvent(
    eventNameOrMemeId: AllowedEventName | string,
    optionsOrEventType?:
      | {
          memeId?: string | null;
          category?: string | null;
          screenName?: string | null;
          sourceChannel?: string | null;
          properties?: Record<string, any>;
        }
      | string,
    legacyTimeOnMeme?: number
  ): Promise<boolean> {
    // 1. Consent check: Do not create or transmit behavioral analytics events unless analytics_consent is granted.
    if (!this.isAnalyticsGranted()) {
      return false;
    }

    // 2. Client-side hourly rate limit: 600 events per hour
    if (!this.hourlyRateLimiter.allowEvent()) {
      return false;
    }

    let eventName: AllowedEventName;
    let memeId = '';
    let category = '';
    let screenName = '';
    let sourceChannel = '';
    let cleanProps: Record<string, any> = {};

    if (ALLOWED_EVENT_NAMES.has(eventNameOrMemeId as AllowedEventName)) {
      eventName = eventNameOrMemeId as AllowedEventName;
      if (optionsOrEventType && typeof optionsOrEventType === 'object') {
        memeId = optionsOrEventType.memeId || '';
        category = optionsOrEventType.category || '';
        screenName = optionsOrEventType.screenName || '';
        sourceChannel = optionsOrEventType.sourceChannel || '';
        cleanProps = sanitizeProperties(optionsOrEventType.properties);
      }
    } else if (typeof optionsOrEventType === 'string') {
      // Legacy call: trackEvent(memeId, eventType)
      memeId = eventNameOrMemeId;
      const legacyType = optionsOrEventType;
      switch (legacyType) {
        case 'view':
          eventName = 'meme_view';
          break;
        case 'like':
          eventName = 'meme_like';
          cleanProps = { action: 'like' };
          break;
        case 'unlike':
          eventName = 'meme_like';
          cleanProps = { action: 'unlike' };
          break;
        case 'share':
          eventName = 'meme_share';
          break;
        case 'download':
          eventName = 'meme_save';
          cleanProps = { action: 'download' };
          break;
        case 'keep':
          eventName = 'meme_scroll';
          cleanProps = { direction: 'keep' };
          break;
        case 'skip':
          eventName = 'meme_scroll';
          cleanProps = { direction: 'skip' };
          break;
        case 'reaction':
          eventName = 'meme_like';
          cleanProps = { reaction: true };
          break;
        case 'long_view':
          eventName = 'meme_view';
          cleanProps = { duration_ms: legacyTimeOnMeme || 10000 };
          break;
        case 're_fetch':
          eventName = 'feed_refresh';
          break;
        default:
          return false;
      }
    } else {
      return false;
    }

    // Deduplicate meme_view: fire once per displayed meme, not on re-render
    if (eventName === 'meme_view') {
      if (memeId && memeId === this.lastViewedMemeId) {
        return false;
      }
      this.lastViewedMemeId = memeId || null;
    }

    const { clean: sanitizedProps } = validateAndSanitizePropertiesBeforeEnqueue(cleanProps);

    // If native bridge exists, route to Android SQLite queue
    if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
      window.MemeCapsuleAnalytics.trackEvent(
        eventName,
        memeId,
        category,
        screenName,
        sourceChannel,
        JSON.stringify(sanitizedProps)
      );
      return true;
    }

    // Web / JS queue fallback
    if (!this.userHash) {
      this.userHash = await getUserHash();
    }

    const event: AnalyticsEvent = {
      schema_version: 1,
      event_id: this.generateUuid(),
      event_name: eventName,
      user_hash: this.userHash || (await getUserHash()),
      session_id: this.sessionId,
      timestamp_utc: ClockOffsetManager.getCorrectedNowUtc(),
      platform: 'android',
      app_version: sanitizeAppVersion('3.8'),
      os_version: 'Android',
      country: typeof navigator !== 'undefined' ? (navigator.language ? navigator.language.split('-')[1] || null : null) : null,
      meme_id: memeId || undefined,
      category: category || undefined,
      source_channel: sourceChannel || undefined,
      screen_name: screenName || undefined,
      properties: sanitizedProps,
      consent_status: 'granted',
      consent_version: this.consent.consent_version || 'v1',
    };

    const enqueued = this.queue.enqueue(event);

    // Flush immediately after the first event of a session once consent is granted
    if (eventName === 'session_start' && this.isAnalyticsGranted()) {
      this.flush();
    }

    // Coalesce bursts: flush when 10 or more events are queued (debounce 2s)
    if (this.queue.size() >= 10) {
      this.triggerDebouncedFlush(2000);
    }

    // Foreground 20s (+0-5s jitter) cadence if queue non-empty
    if (this.isForeground && this.queue.size() > 0) {
      this.ensureForegroundTimer();
    }

    return enqueued;
  }

  public async flush(): Promise<boolean> {
    if (!this.isAnalyticsGranted()) {
      return false;
    }

    if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
      window.MemeCapsuleAnalytics.flushQueue();
      return true;
    }

    return uploaderService.flush(this.queue);
  }

  public getDiagnosticStats(): DiagnosticStats {
    if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
      try {
        const raw = window.MemeCapsuleAnalytics.getDiagnosticStats();
        return JSON.parse(raw);
      } catch {
        // Fallback
      }
    }
    return uploaderService.getDiagnosticStats(
      this.queue.size(),
      this.queue.getDroppedCount() + this.hourlyRateLimiter.getDroppedCount()
    );
  }

  public startSession(): void {
    this.sessionId = this.generateUuid();
    this.isSessionActive = true;
    this.trackEvent('session_start', { screenName: 'app' });
    if (this.isAnalyticsGranted()) {
      this.flush();
    }
  }

  public endSession(): void {
    if (!this.isSessionActive) return;
    this.trackEvent('session_end', { screenName: 'app' });
    this.isSessionActive = false;
    this.stopTimers();
    this.flush();
  }

  public clearQueue(): void {
    this.queue.clear();
    this.stopTimers();
    if (typeof window !== 'undefined' && window.MemeCapsuleAnalytics) {
      window.MemeCapsuleAnalytics.clearQueue();
    }
  }
}

export function useAnalytics() {
  const service = AnalyticsService.getInstance();
  const [consent, setConsentState] = useState<ConsentState>(() => service.getConsent());
  const [diagnostics, setDiagnostics] = useState<DiagnosticStats>(() => service.getDiagnosticStats());

  useEffect(() => {
    service.onAppForeground();
    service.trackEvent('app_open', { screenName: 'app' });
    service.startSession();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        service.onAppBackground();
      } else if (document.visibilityState === 'visible') {
        service.onAppForeground();
      }
      setDiagnostics(service.getDiagnosticStats());
    };

    const handleBeforeUnload = () => {
      service.endSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      service.endSession();
    };
  }, []);

  const updateConsent = useCallback((analytics: boolean, advertising: boolean, version: string | number = 'v1') => {
    service.setConsent(analytics, advertising, version);
    setConsentState(service.getConsent());
    setDiagnostics(service.getDiagnosticStats());
  }, []);

  const trackEvent = useCallback(
    (
      eventNameOrMemeId: AllowedEventName | string,
      optionsOrEventType?: any,
      legacyTimeOnMeme?: number
    ) => {
      service.trackEvent(eventNameOrMemeId, optionsOrEventType, legacyTimeOnMeme);
    },
    []
  );

  const refreshDiagnostics = useCallback(() => {
    setDiagnostics(service.getDiagnosticStats());
  }, []);

  const flushQueue = useCallback(async () => {
    await service.flush();
    setDiagnostics(service.getDiagnosticStats());
  }, []);

  return {
    sessionId: service.getSessionId(),
    consent,
    updateConsent,
    diagnostics,
    refreshDiagnostics,
    flushQueue,
    trackEvent,
    // Lifecycle & product convenience trackers
    trackScreenView: (screenName: string) => trackEvent('screen_view', { screenName }),
    trackMemeView: (memeId: string, category?: string) =>
      trackEvent('meme_view', { memeId, category, screenName: 'deck' }),
    trackMemeLike: (memeId: string, isLiked: boolean) =>
      trackEvent('meme_like', { memeId, properties: { action: isLiked ? 'like' : 'unlike' } }),
    trackMemeShare: (memeId: string, sourceChannel?: string) =>
      trackEvent('meme_share', { memeId, sourceChannel }),
    trackMemeSave: (memeId: string, destination = 'vault') =>
      trackEvent('meme_save', { memeId, properties: { destination } }),
    trackMemeScroll: (memeId: string, direction = 'next') =>
      trackEvent('meme_scroll', { memeId, properties: { direction } }),
    trackCategoryClick: (category: string) =>
      trackEvent('category_click', { category }),
    trackOnboardingComplete: () =>
      trackEvent('onboarding_complete', { screenName: 'onboarding' }),
    trackProfileOpen: () =>
      trackEvent('profile_open', { screenName: 'profile' }),
    trackSubscriptionClick: (sku?: string) =>
      trackEvent('subscription_click', { screenName: 'store', properties: { sku } }),
    trackFeedRefresh: () =>
      trackEvent('feed_refresh', { screenName: 'home' }),
    trackMemeReported: (memeId: string, reason?: string) =>
      trackEvent('meme_reported', { memeId, properties: { reason } }),
    trackAdImpression: (adType: string) =>
      trackEvent('ad_impression', { properties: { ad_type: adType } }),
    trackAdRewardViewed: (rewardType: string) =>
      trackEvent('ad_reward_viewed', { properties: { reward_type: rewardType } }),
    trackRetentionCheckin: (streakCount?: number) =>
      trackEvent('retention_checkin', { properties: { streak: streakCount } }),
  };
}
