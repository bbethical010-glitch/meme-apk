import { useEffect, useRef } from 'react';
import { EventType } from './analyticsTypes';
import { getDeviceId } from './deviceId';
import { AnalyticsQueue } from './analyticsQueue';
import { flushQueue } from './analyticsFlush';

export function useAnalytics(): {
  trackEvent: (memeId: string, eventType: EventType, timeOnMemeMs?: number) => void;
  sessionId: string;
} {
  const sessionIdRef = useRef<string>('');
  const deviceIdRef = useRef<string>('');
  const queueRef = useRef<AnalyticsQueue | null>(null);
  
  const lastViewRef = useRef<{ memeId: string; timestamp: number } | null>(null);
  const longViewTimeoutRef = useRef<number | null>(null);
  const seenMemeIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    queueRef.current = new AnalyticsQueue();
    getDeviceId().then(id => {
      deviceIdRef.current = id;
    });

    const flushInterval = setInterval(() => {
      if (queueRef.current && deviceIdRef.current && sessionIdRef.current) {
        flushQueue(queueRef.current, deviceIdRef.current, sessionIdRef.current);
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (queueRef.current && deviceIdRef.current && sessionIdRef.current) {
          flushQueue(queueRef.current, deviceIdRef.current, sessionIdRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(flushInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (longViewTimeoutRef.current) clearTimeout(longViewTimeoutRef.current);
    };
  }, []);

  const trackEvent = (memeId: string, eventType: EventType, timeOnMemeMs = 0) => {
    if (!queueRef.current) return;
    const queue = queueRef.current;
    const now = Date.now();

    // Skip detection logic
    if (eventType === 'view') {
      lastViewRef.current = { memeId, timestamp: now };
    } else {
      if (lastViewRef.current && lastViewRef.current.memeId !== memeId) {
        if (now - lastViewRef.current.timestamp < 2000) {
          queue.enqueue(lastViewRef.current.memeId, 'skip', now - lastViewRef.current.timestamp);
        }
      }
    }

    // Long view detection logic
    if (eventType === 'view') {
      if (longViewTimeoutRef.current) window.clearTimeout(longViewTimeoutRef.current);
      longViewTimeoutRef.current = window.setTimeout(() => {
        queue.enqueue(memeId, 'long_view', 10000);
      }, 10000);
    } else {
      if (lastViewRef.current?.memeId === memeId && longViewTimeoutRef.current) {
        window.clearTimeout(longViewTimeoutRef.current);
        longViewTimeoutRef.current = null;
      }
    }

    // Re-fetch detection logic
    if (eventType === 'view') {
      if (seenMemeIdsRef.current.has(memeId)) {
        queue.enqueue(memeId, 're_fetch', 0);
      } else {
        seenMemeIdsRef.current.add(memeId);
      }
    }

    queue.enqueue(memeId, eventType, timeOnMemeMs);

    if (queue.size() > 100 && deviceIdRef.current && sessionIdRef.current) {
      flushQueue(queue, deviceIdRef.current, sessionIdRef.current);
    }
  };

  return {
    trackEvent,
    sessionId: sessionIdRef.current,
  };
}
