import { EventType, MemeEvent } from './analyticsTypes';

export class AnalyticsQueue {
  private events: MemeEvent[] = [];
  private sequence = 0;

  enqueue(meme_id: string, event_type: EventType, time_on_meme_ms = 0): void {
    this.sequence++;
    const event: MemeEvent = {
      meme_id,
      event_type,
      time_on_meme_ms,
      timestamp: Date.now(),
      sequence: this.sequence,
    };

    if (this.events.length >= 200) {
      this.events.shift(); // circular buffer behavior, drop oldest
    }
    this.events.push(event);
  }

  drain(): MemeEvent[] {
    const pendingEvents = [...this.events];
    this.events = [];
    return pendingEvents;
  }

  peek(): MemeEvent[] {
    return [...this.events];
  }

  size(): number {
    return this.events.length;
  }

  requeue(failedEvents: MemeEvent[]): void {
    this.events = [...failedEvents, ...this.events].slice(0, 200);
  }
}
