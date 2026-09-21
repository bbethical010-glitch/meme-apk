export * from './analyticsTypes';
export * from './deviceId';
export * from './analyticsQueue';
export * from './analyticsFlush';
export * from './useAnalytics';

export const ANALYTICS_API_BASE = (import.meta as any).env.VITE_API_BASE_URL ?? 'https://meme-capsule-eww.pages.dev';
