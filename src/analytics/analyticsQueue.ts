import {
  AnalyticsEvent,
  ALLOWED_EVENT_NAMES,
  MAX_QUEUE_SIZE,
  MAX_CHUNK_SIZE,
  MAX_BATCH_SIZE,
  EVENT_MAX_AGE_MS,
} from './analyticsTypes';

export { MAX_QUEUE_SIZE, MAX_BATCH_SIZE, MAX_CHUNK_SIZE };

const QUEUE_STORAGE_KEY = 'meme_capsule_analytics_queue';

export class AnalyticsQueue {
  private events: AnalyticsEvent[] = [];
  private droppedCount = 0;

  constructor(private customMaxQueueSize = MAX_QUEUE_SIZE) {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed.map((e) => ({
            ...e,
            schema_version: 1,
            consent_status: 'granted',
            consent_version: e.consent_version || 'v1',
          }));
        }
      }
    } catch {
      this.events = [];
    }
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // LocalStorage full or unavailable
    }
  }

  /**
   * Drops events older than 23 hours and increments dropped counter.
   */
  public dropExpiredEvents(nowMs = Date.now()): number {
    if (this.events.length === 0) return 0;
    const cutoff = nowMs - EVENT_MAX_AGE_MS;
    
    // Fast path: since events are added in chronological order, if the oldest event
    // is not expired, no events in the queue are expired.
    try {
      const oldestTime = new Date(this.events[0].timestamp_utc).getTime();
      if (!isNaN(oldestTime) && oldestTime >= cutoff) {
        return 0;
      }
    } catch {
      // fall through to filter
    }

    const initialLen = this.events.length;
    this.events = this.events.filter((e) => {
      try {
        const time = new Date(e.timestamp_utc).getTime();
        return !isNaN(time) && time >= cutoff;
      } catch {
        return false;
      }
    });

    const expired = initialLen - this.events.length;
    if (expired > 0) {
      this.droppedCount += expired;
      this.saveToStorage();
    }
    return expired;
  }

  public enqueue(event: AnalyticsEvent): boolean {
    if (!ALLOWED_EVENT_NAMES.has(event.event_name)) {
      return false;
    }

    // Drop expired events older than 23h
    this.dropExpiredEvents();

    const maxCap = this.customMaxQueueSize;
    if (this.events.length >= maxCap) {
      const excess = this.events.length - maxCap + 1;
      this.events.splice(0, excess);
      this.droppedCount += excess;
    }

    this.events.push(event);
    this.saveToStorage();
    return true;
  }

  public peekBatch(limit = MAX_BATCH_SIZE): AnalyticsEvent[] {
    this.dropExpiredEvents();
    const safeLimit = Math.min(limit, MAX_BATCH_SIZE);
    return this.events.slice(0, safeLimit);
  }

  public peekChunk(limit = MAX_CHUNK_SIZE): AnalyticsEvent[] {
    return this.peekBatch(limit);
  }

  public removeEvents(eventIds: string[]): void {
    if (!eventIds || eventIds.length === 0) return;
    const idSet = new Set(eventIds);
    this.events = this.events.filter((e) => !idSet.has(e.event_id));
    this.saveToStorage();
  }

  public size(): number {
    return this.events.length;
  }

  public getDroppedCount(): number {
    return this.droppedCount;
  }

  public clear(): void {
    this.events = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    }
  }
}
