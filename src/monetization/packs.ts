import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { Meme } from '../types';
import { isPackUnlocked } from './rewards';

export const PACKS = [
  { id: 'programming', name: 'CODE CHAOS', subreddit: 'ProgrammerHumor' },
  { id: 'wholesome', name: 'GOOD ENERGY', subreddit: 'wholesomememes' },
] as const;
export type PackId = typeof PACKS[number]['id'];

// Separate themed-subset request path. The main random feed and FIFO are untouched.
export async function fetchPackMeme(packId: PackId): Promise<Meme> {
  const pack = PACKS.find(item => item.id === packId);
  if (!pack || !isPackUnlocked(packId)) throw new Error('Pack is locked');
  let blocked: string[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem('reported_memes') || '[]');
    if (Array.isArray(stored)) blocked = stored;
  } catch { /* empty blocklist */ }
  for (let attempt = 0; attempt < 4; attempt++) {
    const url = `https://meme-api.com/gimme/${pack.subreddit}`;
    let data;
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({ url, connectTimeout: 10000, readTimeout: 10000 });
      if (response.status !== 200) throw new Error('Pack unavailable');
      data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Pack unavailable');
      data = await response.json();
    }
    if (!isPackUnlocked(packId)) throw new Error('Pack expired');
    if (typeof data.url !== 'string' || !data.url.startsWith('https://') || data.nsfw || data.spoiler ||
        data.subreddit?.toLowerCase() !== pack.subreddit.toLowerCase() ||
        /\.gifv|v\.redd\.it|\/gallery\//i.test(data.url) || blocked.includes(data.url)) continue;
    return { url: data.url, title: data.title || pack.name, author: data.author || 'reddit', subreddit: pack.subreddit, source: 'Reddit', mediaType: 'image' };
  }
  throw new Error('No safe pack meme available');
}
