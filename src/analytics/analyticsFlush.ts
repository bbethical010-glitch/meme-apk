import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { AnalyticsQueue, MAX_BATCH_SIZE, MAX_CHUNK_SIZE } from './analyticsQueue';
import {
  AnalyticsEvent,
  DiagnosticStats,
  EventBatchRequest,
  MAX_CHUNK_BYTES,
  EVENT_MAX_AGE_MS,
  HOURLY_EVENT_LIMIT,
} from './analyticsTypes';
import { AnalyticsAuthProvider, defaultAuthProvider, StaticTokenAuthProvider } from './analyticsAuth';

export const ANALYTICS_ENDPOINT =
  (import.meta as any).env?.VITE_ANALYTICS_ENDPOINT ??
  'https://meme-capsule-eww.pages.dev/api/analytics/events';

// Backwards-compatible export; in web builds, no app token is used or bundled.
export const ANALYTICS_APP_TOKEN = '';

const INITIAL_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 120000;

const SERVER_INITIAL_BACKOFF_MS = 5000;
const SERVER_MAX_BACKOFF_MS = 15 * 60 * 1000; // 15 minutes

const INITIAL_AUTH_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_AUTH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export class ClockOffsetManager {
  private static offsetMs = 0;
  private static readonly STORAGE_KEY = 'analytics_clock_offset_ms';

  static {
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(ClockOffsetManager.STORAGE_KEY);
        if (val) {
          const num = parseInt(val, 10);
          if (!isNaN(num)) {
            ClockOffsetManager.offsetMs = num;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  public static getOffsetMs(): number {
    return ClockOffsetManager.offsetMs;
  }

  public static setOffsetMs(offset: number): void {
    ClockOffsetManager.offsetMs = offset;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(ClockOffsetManager.STORAGE_KEY, String(offset));
      } catch {
        // ignore
      }
    }
  }

  public static handleServerDateHeader(dateHeader?: string | null, deviceNowMs = Date.now()): void {
    if (!dateHeader) return;
    try {
      const serverTimeMs = Date.parse(dateHeader);
      if (!isNaN(serverTimeMs)) {
        const offset = serverTimeMs - deviceNowMs;
        if (Math.abs(offset) > 60000) {
          ClockOffsetManager.setOffsetMs(offset);
        }
      }
    } catch {
      // ignore
    }
  }

  public static getCorrectedNowUtc(deviceNowMs = Date.now()): string {
    return new Date(deviceNowMs + ClockOffsetManager.offsetMs).toISOString();
  }

  public static clampTimestampIfAhead(timestampUtc: string, deviceNowMs = Date.now()): string {
    try {
      const eventTimeMs = new Date(timestampUtc).getTime();
      const correctedNowMs = deviceNowMs + ClockOffsetManager.offsetMs;
      // Clamp if stamped > 60s ahead of corrected now
      if (eventTimeMs > correctedNowMs + 60000) {
        return new Date(correctedNowMs).toISOString();
      }
    } catch {
      // ignore
    }
    return timestampUtc;
  }
}

export function parseRetryAfter(headerValue?: string | null): number {
  if (!headerValue) return 60000;
  const trimmed = headerValue.trim();
  const seconds = parseInt(trimmed, 10);
  if (!isNaN(seconds) && String(seconds) === trimmed && seconds >= 0) {
    return Math.max(seconds * 1000, 1000);
  }
  const dateMs = Date.parse(trimmed);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    return diff > 0 ? diff : 60000;
  }
  return 60000;
}

export class HourlyRateLimiter {
  private static readonly WINDOW_MS = 60 * 60 * 1000;
  private timestamps: number[] = [];
  private droppedCount = 0;

  constructor(private maxEventsPerHour = HOURLY_EVENT_LIMIT) {}

  public allowEvent(nowMs = Date.now()): boolean {
    const cutoff = nowMs - HourlyRateLimiter.WINDOW_MS;
    while (this.timestamps.length > 0 && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
    if (this.timestamps.length >= this.maxEventsPerHour) {
      this.droppedCount++;
      return false;
    }
    this.timestamps.push(nowMs);
    return true;
  }

  public getDroppedCount(): number {
    return this.droppedCount;
  }

  public reset(): void {
    this.timestamps = [];
    this.droppedCount = 0;
  }
}

export class AnalyticsUploaderService {
  private authProvider: AnalyticsAuthProvider;
  private isAuthDisabled = false;
  private consecutiveErrors = 0;
  private nextAllowedFlushTimeMs = 0;
  private authCooldownMs = INITIAL_AUTH_COOLDOWN_MS;

  private acceptedCount = 0;
  private rejectedCount = 0;
  private poisonDropCount = 0;
  private lastFlushTimeUtc: string | null = null;
  private lastError: string | null = null;

  private isFlushInFlight = false;
  private currentChunkLimit = MAX_CHUNK_SIZE;
  public chunkSpacingMs = 1000; // Configurable for fast unit tests

  constructor(authProvider: AnalyticsAuthProvider = defaultAuthProvider) {
    this.authProvider = authProvider;
  }

  public setAuthProvider(authProvider: AnalyticsAuthProvider): void {
    this.authProvider = authProvider;
  }

  public getAuthProvider(): AnalyticsAuthProvider {
    return this.authProvider;
  }

  public calculateBackoff(attempts: number): number {
    if (attempts <= 0) return 0;
    const shift = Math.min(attempts - 1, 6);
    const delay = INITIAL_BACKOFF_MS * Math.pow(2, shift);
    return Math.min(delay, MAX_BACKOFF_MS);
  }

  public calculateServerBackoff(consecutiveErrors: number): number {
    if (consecutiveErrors <= 0) return 0;
    const shift = Math.min(consecutiveErrors - 1, 8);
    const baseDelay = SERVER_INITIAL_BACKOFF_MS * Math.pow(2, shift);
    const capped = Math.min(baseDelay, SERVER_MAX_BACKOFF_MS);
    const jitter = Math.floor(Math.random() * 1000);
    return capped + jitter;
  }

  public getDiagnosticStats(currentQueueCount: number, droppedCount: number): DiagnosticStats {
    return {
      queueCount: currentQueueCount,
      lastFlushTimeUtc: this.lastFlushTimeUtc,
      acceptedCount: this.acceptedCount,
      rejectedCount: this.rejectedCount,
      droppedCount: droppedCount,
      lastError: this.lastError,
    };
  }

  public getPoisonDropCount(): number {
    return this.poisonDropCount;
  }

  public resetAuthDisabled(): void {
    this.isAuthDisabled = false;
    this.authCooldownMs = INITIAL_AUTH_COOLDOWN_MS;
    if (this.authProvider instanceof StaticTokenAuthProvider) {
      this.authProvider.resetAuthDisabled();
    }
    this.consecutiveErrors = 0;
    this.nextAllowedFlushTimeMs = 0;
  }

  public canSendNow(): boolean {
    if (this.isAuthDisabled) return false;
    return Date.now() >= this.nextAllowedFlushTimeMs;
  }

  public async flush(queue: AnalyticsQueue): Promise<boolean> {
    if (this.isFlushInFlight) return false;
    if (this.isAuthDisabled && Date.now() < this.nextAllowedFlushTimeMs) return false;
    if (Date.now() < this.nextAllowedFlushTimeMs) return false;

    // Browser analytics guard: When running in a standard web browser (non-native platform)
    // without an explicitly configured auth provider, keep browser uploads disabled.
    if (!Capacitor.isNativePlatform() && !this.authProvider.isConfigured()) {
      return false;
    }

    this.isFlushInFlight = true;
    try {
      let overallSuccess = true;

      while (queue.size() > 0) {
        if (Date.now() < this.nextAllowedFlushTimeMs) {
          overallSuccess = false;
          break;
        }

        // Drop any expired events (>23h) before chunking
        queue.dropExpiredEvents();
        if (queue.size() === 0) break;

        const rawBatch = queue.peekChunk(this.currentChunkLimit);
        if (rawBatch.length === 0) break;

        // Size check for max 1 MiB chunk bytes
        const batch: AnalyticsEvent[] = [];
        let accumulatedBytes = 30; // Overhead for {"events":[]}
        for (const ev of rawBatch) {
          // Clamp timestamp if ahead
          const clampedEvent: AnalyticsEvent = {
            ...ev,
            timestamp_utc: ClockOffsetManager.clampTimestampIfAhead(ev.timestamp_utc),
          };
          const evBytes = typeof TextEncoder !== 'undefined'
            ? new TextEncoder().encode(JSON.stringify(clampedEvent)).length
            : JSON.stringify(clampedEvent).length;

          if (accumulatedBytes + evBytes + 2 > MAX_CHUNK_BYTES) {
            if (batch.length > 0) break;
          }
          batch.push(clampedEvent);
          accumulatedBytes += evBytes + 1;
        }

        const authHeaders = await this.authProvider.getAuthHeaders();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Client-Sent-At': ClockOffsetManager.getCorrectedNowUtc(),
          ...authHeaders,
        };

        const response = await this.sendChunkDirect(batch, headers);
        const status = response.status;
        const resHeaders = response.headers;

        // Process HTTP Date response header
        const dateHeader = resHeaders['date'] || resHeaders['Date'];
        if (dateHeader) {
          ClockOffsetManager.handleServerDateHeader(dateHeader);
        }

        if (status >= 200 && status < 300) {
          const sentIds = batch.map((e) => e.event_id);
          queue.removeEvents(sentIds);
          this.acceptedCount += sentIds.length;
          this.lastFlushTimeUtc = new Date().toISOString();
          this.lastError = null;
          this.consecutiveErrors = 0;
          this.nextAllowedFlushTimeMs = 0;
          this.currentChunkLimit = MAX_CHUNK_SIZE;
        } else if (status === 400 || status === 422) {
          // Bisect and isolate poison events
          await this.bisectAndIsolate(batch, queue, headers);
        } else if (status === 401 || status === 403) {
          this.authProvider.onAuthFailure();
          this.isAuthDisabled = true;
          this.nextAllowedFlushTimeMs = Date.now() + this.authCooldownMs;
          this.authCooldownMs = Math.min(this.authCooldownMs * 2, MAX_AUTH_COOLDOWN_MS);
          const statusText = status === 401 ? 'Unauthorized' : 'Forbidden';
          this.lastError = `HTTP ${status} ${statusText}: Configuration failure (${this.authProvider.getAuthMode()}). Sending paused.`;
          overallSuccess = false;
          break;
        } else if (status === 413) {
          // Halve chunk size
          this.currentChunkLimit = Math.max(1, Math.floor(this.currentChunkLimit / 2));
          this.lastError = `HTTP 413: Payload Too Large. Halved chunk size to ${this.currentChunkLimit}.`;
        } else if (status === 429) {
          this.consecutiveErrors++;
          const retryAfterVal = resHeaders['retry-after'] || resHeaders['Retry-After'];
          const waitMs = parseRetryAfter(retryAfterVal);
          this.nextAllowedFlushTimeMs = Date.now() + waitMs;
          this.lastError = `HTTP 429: Rate limited. Retrying after ${Math.round(waitMs / 1000)}s.`;
          overallSuccess = false;
          break;
        } else {
          // 5xx or network failure
          this.consecutiveErrors++;
          const backoff = this.calculateServerBackoff(this.consecutiveErrors);
          this.nextAllowedFlushTimeMs = Date.now() + backoff;
          this.lastError = `HTTP ${status}: Server error. Retrying in ${Math.round(backoff / 1000)}s.`;
          overallSuccess = false;
          break;
        }

        // If there are more events remaining, wait at least chunkSpacingMs between chunks
        if (queue.size() > 0 && this.chunkSpacingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.chunkSpacingMs));
        }
      }

      return overallSuccess;
    } finally {
      this.isFlushInFlight = false;
    }
  }

  private async sendChunkDirect(
    batch: AnalyticsEvent[],
    headers: Record<string, string>
  ): Promise<{ status: number; headers: Record<string, string> }> {
    const payload: EventBatchRequest = { events: batch };
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.post({
          url: ANALYTICS_ENDPOINT,
          headers,
          data: payload,
          connectTimeout: 15000,
          readTimeout: 20000,
        });
        const respHeaders: Record<string, string> = {};
        if (res.headers) {
          for (const [k, v] of Object.entries(res.headers)) {
            respHeaders[k.toLowerCase()] = String(v);
          }
        }
        return { status: res.status, headers: respHeaders };
      } else {
        const res = await fetch(ANALYTICS_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const respHeaders: Record<string, string> = {};
        if (res && res.headers) {
          if (typeof (res.headers as any).forEach === 'function') {
            (res.headers as any).forEach((val: string, key: string) => {
              respHeaders[key.toLowerCase()] = val;
            });
          } else if (typeof res.headers === 'object') {
            for (const [k, v] of Object.entries(res.headers)) {
              respHeaders[k.toLowerCase()] = String(v);
            }
          }
        }
        return { status: res ? res.status : 0, headers: respHeaders };
      }
    } catch {
      return { status: 0, headers: {} };
    }
  }

  public async bisectAndIsolate(
    events: AnalyticsEvent[],
    queue: AnalyticsQueue,
    headers: Record<string, string>
  ): Promise<boolean> {
    if (events.length === 0) return true;

    if (events.length === 1) {
      // Single event confirmation send
      const single = events[0];
      const res = await this.sendChunkDirect([single], headers);
      if (res.status === 400 || res.status === 422) {
        // Confirmed poison event: drop only this one and count locally
        queue.removeEvents([single.event_id]);
        this.poisonDropCount++;
        this.rejectedCount++;
        this.lastError = `Poison event ${single.event_id} rejected (HTTP ${res.status}). Dropped.`;
        return true;
      } else if (res.status >= 200 && res.status < 300) {
        queue.removeEvents([single.event_id]);
        this.acceptedCount++;
        return true;
      } else {
        return false;
      }
    }

    const mid = Math.floor(events.length / 2);
    const left = events.slice(0, mid);
    const right = events.slice(mid);

    const leftRes = await this.sendChunkDirect(left, headers);
    if (leftRes.status >= 200 && leftRes.status < 300) {
      queue.removeEvents(left.map((e) => e.event_id));
      this.acceptedCount += left.length;
    } else if (leftRes.status === 400 || leftRes.status === 422) {
      await this.bisectAndIsolate(left, queue, headers);
    }

    const rightRes = await this.sendChunkDirect(right, headers);
    if (rightRes.status >= 200 && rightRes.status < 300) {
      queue.removeEvents(right.map((e) => e.event_id));
      this.acceptedCount += right.length;
    } else if (rightRes.status === 400 || rightRes.status === 422) {
      await this.bisectAndIsolate(right, queue, headers);
    }

    return true;
  }

  public handleResponse(
    status: number,
    eventIds: string[],
    queue: AnalyticsQueue,
    resHeaders: Record<string, string> = {}
  ): boolean {
    const dateHeader = resHeaders['date'] || resHeaders['Date'];
    if (dateHeader) {
      ClockOffsetManager.handleServerDateHeader(dateHeader);
    }

    if (status >= 200 && status < 300) {
      queue.removeEvents(eventIds);
      this.acceptedCount += eventIds.length;
      this.lastFlushTimeUtc = new Date().toISOString();
      this.lastError = null;
      this.consecutiveErrors = 0;
      this.nextAllowedFlushTimeMs = 0;
      return true;
    }

    if (status === 400 || status === 422) {
      queue.removeEvents(eventIds);
      this.rejectedCount += eventIds.length;
      this.lastError = `HTTP ${status}: Permanent validation failure. Dropped invalid batch.`;
      return false;
    }

    if (status === 401 || status === 403) {
      this.authProvider.onAuthFailure();
      this.isAuthDisabled = true;
      this.nextAllowedFlushTimeMs = Date.now() + this.authCooldownMs;
      this.authCooldownMs = Math.min(this.authCooldownMs * 2, MAX_AUTH_COOLDOWN_MS);
      const statusText = status === 401 ? 'Unauthorized' : 'Forbidden';
      this.lastError = `HTTP ${status} ${statusText}: Configuration failure (${this.authProvider.getAuthMode()}). Sending paused.`;
      return false;
    }

    if (status === 404 || status === 405) {
      this.isAuthDisabled = true;
      this.lastError = `HTTP ${status}: Endpoint configuration failure. Sending disabled.`;
      return false;
    }

    if (status === 413) {
      this.currentChunkLimit = Math.max(1, Math.floor(this.currentChunkLimit / 2));
      this.lastError = `HTTP 413: Payload Too Large. Halved chunk size to ${this.currentChunkLimit}.`;
      return false;
    }

    if (status === 429) {
      this.consecutiveErrors++;
      const retryAfterVal = resHeaders['retry-after'] || resHeaders['Retry-After'];
      const waitMs = parseRetryAfter(retryAfterVal);
      this.nextAllowedFlushTimeMs = Date.now() + waitMs;
      this.lastError = `HTTP 429: Rate limited. Retrying after ${Math.round(waitMs / 1000)}s.`;
      return false;
    }

    // 5xx / other server error
    this.consecutiveErrors++;
    const backoff = this.calculateServerBackoff(this.consecutiveErrors);
    this.nextAllowedFlushTimeMs = Date.now() + backoff;
    this.lastError = `HTTP ${status}: Server error. Retrying in ${Math.round(backoff / 1000)}s.`;
    return false;
  }
}

export const uploaderService = new AnalyticsUploaderService();
