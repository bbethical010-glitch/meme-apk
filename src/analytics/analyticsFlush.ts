import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { AnalyticsQueue } from './analyticsQueue';
import { EventBatchPayload, FlushResult } from './analyticsTypes';
import { ANALYTICS_API_BASE } from './index';

export async function flushQueue(
  queue: AnalyticsQueue,
  deviceId: string,
  sessionId: string
): Promise<FlushResult | null> {
  const events = queue.drain();
  if (events.length === 0) return null;

  const payload: EventBatchPayload = {
    device_id: deviceId,
    session_id: sessionId,
    app_version: '1.0.0',
    events,
  };

  try {
    const url = `${ANALYTICS_API_BASE}/api/events`;
    
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
      });

      if (response.status >= 200 && response.status < 300) {
        return (typeof response.data === 'string' ? JSON.parse(response.data) : response.data) as FlushResult;
      }
      throw new Error(`Native HTTP error: ${response.status}`);
    } else {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return (await response.json()) as FlushResult;
      }
      throw new Error(`Web fetch error: ${response.status}`);
    }
  } catch (error) {
    if ((import.meta as any).env.DEV) {
      console.warn('Analytics flush failed, requeuing events.', error);
    }
    queue.requeue(events);
    return null;
  }
}
