export type EventType =
  | 'view'
  | 'like'
  | 'unlike'
  | 'share'
  | 'download'
  | 'skip'
  | 'keep'
  | 'long_view'
  | 're_fetch'
  | 'reaction';

export interface MemeEvent {
  meme_id: string;
  event_type: EventType;
  time_on_meme_ms: number;
  timestamp: number;
  sequence: number;
}

export interface EventBatchPayload {
  device_id: string;
  session_id: string;
  app_version: string;
  events: MemeEvent[];
}

export interface FlushResult {
  received: number;
  inserted: number;
  rejected: number;
}
