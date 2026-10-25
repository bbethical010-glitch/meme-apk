export interface Meme {
  id?: string;
  url: string;
  title: string;
  author: string;
  subreddit?: string;
  rarity?: string;
  mediaType?: string;
  uploadedAt?: string;
  source?: 'Meme Capsule' | 'Reddit';
  savedAt?: number;
  likes?: number;
}

export interface MoodBoard {
  id: string;
  title: string;
  color: 'primary' | 'secondary' | 'tertiary' | string;
  memeUrls: string[];
  createdAt: number;
}

export type DismissDecision = 'keep' | 'skip' | 'save';
