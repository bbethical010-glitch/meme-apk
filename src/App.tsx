/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  AlertCircle,
  Bookmark,
  ChevronUp,
  Crown,
  Download,
  Flame,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  Lock,
  Plus,
  Share2,
  Smile,
  Trash2,
  User,
  X,
  Sparkles,
  Flag,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { useAnalytics, ANALYTICS_API_BASE, getDeviceId } from './analytics';
import OnboardingModal from './OnboardingModal';
import ProUpgradeModal from './ProUpgradeModal';
import ReportModal from './ReportModal';
import { MemeStack, MemeStackRef } from './components/MemeStack';
import type { Meme, MoodBoard, DismissDecision } from './types';

export type { Meme, MoodBoard };

declare global {
  interface Window {
    MemeCapsuleAndroid?: {
      downloadImage: (url: string, fileName: string) => void;
      shareImage: (url: string, fileName: string, title: string) => void;
    };
  }
}

const RANDOM_MEME_ENDPOINT = 'https://meme-capsule-eww.pages.dev/api/random-meme';
const REDDIT_MEME_ENDPOINT = 'https://meme-api.com/gimme';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-2093403233028868/3926550523';
const ADMOB_REWARDED_INTERSTITIAL_ID = 'ca-app-pub-2093403233028868/2261969271';
const INTERSTITIAL_FREQUENCY = 4;
const IAP_PRODUCT_ID = 'remove_ads_forever';
const FREE_VAULT_LIMIT = 20;

type BackendMemePayload = {
  id?: string;
  title?: string;
  url?: string;
  image?: string;
  category?: string;
  rarity?: string;
  media_type?: string;
  uploaded_at?: string;
  rights_note?: string;
  share_text?: string;
  likes_count?: number;
};

type RedditMemePayload = {
  postLink?: string;
  subreddit?: string;
  title?: string;
  url?: string;
  author?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  preview?: string[];
  ups?: number;
};

const DEV_JOKES = [
  'WHY DO PROGRAMMERS PREFER DARK MODE? BECAUSE LIGHT ATTRACTS BUGS.',
  "THERE ARE 10 TYPES OF PEOPLE: THOSE WHO UNDERSTAND BINARY, AND THOSE WHO DON'T.",
  "HOW MANY PROGRAMMERS DOES IT TAKE TO CHANGE A LIGHT BULB? NONE, THAT'S A HARDWARE PROBLEM.",
  "A SQL QUERY WALKS INTO A BAR, WALKS UP TO TWO TABLES AND ASKS, 'CAN I JOIN YOU?'",
  "ALGORITHM: WORDS USED BY PROGRAMMERS WHEN THEY DON'T WANT TO EXPLAIN WHAT THEY DID.",
  "MY CODE DOESN'T WORK, I DON'T KNOW WHY. MY CODE WORKS, I DON'T KNOW WHY.",
  "WHY DID THE D1 DATABASE BREAK UP WITH THE FRONTEND? 'YOU SEND ME MIXED REQUESTS!'",
];

const HACKER_LOGS = [
  'CONTACTING MEME NETWORK...',
  'HARVESTING CLOUDFLARE D1 SHARDS...',
  'CHECKING REDDIT MEME RELAY...',
  'SYNCING R2 IMAGE PAYLOAD...',
  'FILTERING CRINGE FREQUENCIES...',
  'EXTRACTING OPTIMAL IRREVERENCE MATRIX...',
  'DECRYPTING COMEDY CORE CODE...',
];

const normalizeMeme = (data: BackendMemePayload): Meme => ({
  id: data.id,
  url: data.url || data.image || '',
  title: data.title || data.share_text || 'UNTITLED MASTERPIECE',
  author: data.rights_note || 'Meme Capsule Vault',
  subreddit: data.category || 'D1 Vault',
  rarity: data.rarity,
  mediaType: data.media_type || 'image',
  uploadedAt: data.uploaded_at,
  source: 'Meme Capsule',
  likes: data.likes_count || 0,
});

const normalizeRedditMeme = (data: RedditMemePayload): Meme => ({
  url: data.url || data.preview?.[data.preview.length - 1] || '',
  title: data.title || 'UNTITLED REDDIT DROP',
  author: data.author || 'reddit',
  subreddit: data.subreddit || 'memes',
  rarity: 'Reddit',
  mediaType: 'image',
  source: 'Reddit',
  likes: data.ups || 0,
});

const fetchJson = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      headers: { Accept: 'application/json' },
      connectTimeout: 15000,
      readTimeout: 15000,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Meme Capsule backend returned ${response.status}`);
    }

    return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Meme source returned ${res.status}`);
  return res.json();
};

const fetchBackendMemePayload = () => fetchJson(RANDOM_MEME_ENDPOINT);
const fetchRedditMemePayload = () => fetchJson(REDDIT_MEME_ENDPOINT);

const safeFileName = (title: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'meme-capsule'}.jpg`;

type TabType = 'home' | 'favorites' | 'boards';
type ScreenState = 'waiting' | 'loading' | 'viewing' | 'error';

const MEME_REACTIONS = [
  { emoji: '💀', label: 'DEAD' },
  { emoji: '🔥', label: 'FIRE' },
  { emoji: '😂', label: 'LMAO' },
  { emoji: '🗿', label: 'BRUH' },
  { emoji: '❤️', label: 'LOVE' },
  { emoji: '👑', label: 'KING' },
];

const SWIPE_THRESHOLD = 50;
const PIPELINE_TARGET_SIZE = 7;
const PIPELINE_INITIAL_BATCH = 5;

export default function App() {
  const { trackEvent } = useAnalytics();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [screen, setScreen] = useState<ScreenState>('waiting');
  const [meme, setMeme] = useState<Meme | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentLog, setCurrentLog] = useState(HACKER_LOGS[0]);
  const [favorites, setFavorites] = useState<Meme[]>([]);
  const [moodBoards, setMoodBoards] = useState<MoodBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isBoardComposerOpen, setIsBoardComposerOpen] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [totalMemesViewed, setTotalMemesViewed] = useState(0);
  const [totalMemesFetched, setTotalMemesFetched] = useState(0);
  const [likedMemes, setLikedMemes] = useState<string[]>([]);
  const [searchFavQuery, setSearchFavQuery] = useState('');
  const [toastText, setToastText] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'primary' | 'secondary' | 'tertiary' | 'success'>('primary');
  const [shakeCard, setShakeCard] = useState(false);
  const [memeFeedback, setMemeFeedback] = useState<string | null>(null);
  const [jokeIndex, setJokeIndex] = useState(0);
  const [adMobReady, setAdMobReady] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [streak, setStreak] = useState(1);
  const [multiDropMemes, setMultiDropMemes] = useState<Meme[]>([]);
  const [multiDropIndex, setMultiDropIndex] = useState(0);
  const [isMultiDropView, setIsMultiDropView] = useState(false);

  // Reaction state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [memeReactions, setMemeReactions] = useState<Record<string, string>>({});
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Swipe state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [memeHistory, setMemeHistory] = useState<Meme[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [exitDirection, setExitDirection] = useState<'up' | 'down' | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<MemeStackRef>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleImagePointerDown = useCallback(() => {
    longPressTimerRef.current = setTimeout(() => {
      // Logic handled in the render block to ensure we have current meme
    }, 600);
  }, []);

  const handleImagePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Pipeline queue (FIFO buffer of pre-fetched memes)
  const [memeQueue, setMemeQueue] = useState<Meme[]>([]);
  const [queueFetchCounter, setQueueFetchCounter] = useState(0);
  const isFillingQueue = useRef(false);

  const deckMemes = useMemo(() => {
    if (isMultiDropView && multiDropMemes.length > 0) {
      return multiDropMemes.slice(multiDropIndex);
    }
    return meme ? [meme, ...memeQueue] : memeQueue;
  }, [isMultiDropView, multiDropMemes, multiDropIndex, meme, memeQueue]);

  // Fill the pipeline queue when it drops below target
  const fillPipeline = useCallback(async (currentQueueSize: number, startOffset: number) => {
    if (isFillingQueue.current) return;
    const needed = PIPELINE_TARGET_SIZE - currentQueueSize;
    if (needed <= 0) return;

    isFillingQueue.current = true;
    const fetchPromises: Promise<Meme | null>[] = [];

    for (let i = 0; i < needed; i++) {
      fetchPromises.push(
        fetchValidMeme(startOffset + i + 1).catch((err) => {
          console.warn(`Pipeline fetch #${i} failed:`, err);
          return null;
        })
      );
    }

    // Settle all — add non-null results to queue
    const results = await Promise.allSettled(fetchPromises);
    const newMemes: Meme[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        newMemes.push(result.value);
      }
    }

    if (newMemes.length > 0) {
      setMemeQueue(prev => {
        // Avoid duplicates by URL
        const existingUrls = new Set(prev.map(m => m.url));
        const unique = newMemes.filter(m => !existingUrls.has(m.url));
        return [...prev, ...unique].slice(0, PIPELINE_TARGET_SIZE);
      });
      setQueueFetchCounter(prev => prev + newMemes.length);
    }

    isFillingQueue.current = false;
  }, []);

  // Auto-fill pipeline when queue is low and we're in viewing state
  useEffect(() => {
    if (screen === 'viewing' && memeQueue.length < 3 && !isTransitioning) {
      fillPipeline(memeQueue.length, totalMemesViewed + queueFetchCounter);
    }
  }, [screen, memeQueue.length, isTransitioning, fillPipeline, totalMemesViewed, queueFetchCounter]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_onboarding');
    if (!hasSeen) {
      setIsOnboardingOpen(true);
    }

    // Pro status
    const proStatus = localStorage.getItem('is_pro');
    if (proStatus === 'true') {
      setIsPro(true);
    }

    // Streak tracking
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('streak_last_date');
    const savedStreak = parseInt(localStorage.getItem('streak_count') || '0', 10);

    if (lastDate === today) {
      setStreak(savedStreak || 1);
    } else if (lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        const newStreak = savedStreak + 1;
        setStreak(newStreak);
        localStorage.setItem('streak_count', newStreak.toString());
        localStorage.setItem('streak_last_date', today);
      } else {
        setStreak(1);
        localStorage.setItem('streak_count', '1');
        localStorage.setItem('streak_last_date', today);
      }
    } else {
      setStreak(1);
      localStorage.setItem('streak_count', '1');
      localStorage.setItem('streak_last_date', today);
    }

    const savedFavs = localStorage.getItem('meme_favorites');
    if (savedFavs) {
      try {
        setFavorites(JSON.parse(savedFavs));
      } catch (e) {
        console.error(e);
      }
    }

    const savedBoards = localStorage.getItem('meme_mood_boards');
    if (savedBoards) {
      try {
        const boards = JSON.parse(savedBoards) as MoodBoard[];
        setMoodBoards(boards);
        setSelectedBoardId(boards[0]?.id || null);
      } catch (e) {
        console.error(e);
      }
    }

    const savedReactions = localStorage.getItem('meme_reactions');
    if (savedReactions) {
      try {
        setMemeReactions(JSON.parse(savedReactions));
      } catch (e) {
        console.error(e);
      }
    }

    const savedCount = localStorage.getItem('total_memes_viewed');
    if (savedCount) setTotalMemesViewed(parseInt(savedCount, 10));

    const savedFetched = localStorage.getItem('total_memes_fetched');
    if (savedFetched) setTotalMemesFetched(parseInt(savedFetched, 10));

    const savedLikes = localStorage.getItem('liked_memes');
    if (savedLikes) {
      try {
        setLikedMemes(JSON.parse(savedLikes));
      } catch (e) {
        console.error(e);
      }
    }

    const jokeTimer = setInterval(() => {
      setJokeIndex((prev) => (prev + 1) % DEV_JOKES.length);
    }, 12000);

    if (Capacitor.isNativePlatform()) {
      AdMob.initialize({ initializeForTesting: false })
        .then(() => setAdMobReady(true))
        .catch((error) => console.warn('AdMob init failed', error));
    }

    return () => clearInterval(jokeTimer);
  }, []);

  const maybeShowInterstitial = async (nextViewed: number) => {
    if (isPro || !Capacitor.isNativePlatform() || !adMobReady || nextViewed % INTERSTITIAL_FREQUENCY !== 0) return;

    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_INTERSTITIAL_ID,
        isTesting: false,
        npa: false,
      });
      await AdMob.showInterstitial();
    } catch (error) {
      console.warn('AdMob interstitial skipped', error);
    }
  };

  const showRewardedAdAndGetBonus = async () => {
    // Pro users get instant bonus drops without ads
    if (isPro) {
      showToast('💎 PRO INSTANT DROP!', 'success');
      void fetchMeme();
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      showToast('REWARD UNLOCKED: DANK DROP READY!', 'success');
      void fetchMeme();
      return;
    }

    try {
      showToast('LOADING REWARDED AD...', 'primary');
      await AdMob.prepareRewardInterstitialAd({
        adId: ADMOB_REWARDED_INTERSTITIAL_ID,
        isTesting: false,
        npa: false,
      });
      await AdMob.showRewardInterstitialAd();
      showToast('REWARD UNLOCKED! FRESH DROP INCOMING!', 'success');
      void fetchMeme();
    } catch (error) {
      console.warn('Rewarded Interstitial skipped or failed, trying video fallback', error);
      try {
        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_REWARDED_INTERSTITIAL_ID,
          isTesting: false,
          npa: false,
        });
        await AdMob.showRewardVideoAd();
        showToast('REWARD UNLOCKED! FRESH DROP INCOMING!', 'success');
        void fetchMeme();
      } catch (fallbackError) {
        console.warn('Rewarded video fallback failed', fallbackError);
        showToast('ENJOY YOUR BONUS DROP!', 'secondary');
        void fetchMeme();
      }
    }
  };

const preloadImage = (url: string, timeoutMs = 7000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let timer: ReturnType<typeof setTimeout> | null = null;
    img.onload = () => {
      if (timer) clearTimeout(timer);
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    };
    img.onerror = () => {
      if (timer) clearTimeout(timer);
      resolve(false);
    };
    timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, timeoutMs);
    img.src = url;
  });
};

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.includes('.gifv') || lower.includes('v.redd.it') || lower.includes('/gallery/')) {
    return false;
  }
  return true;
};

const fetchMixedMeme = async (nextViewed: number): Promise<Meme> => {
  const shouldFetchReddit = nextViewed % 3 === 0;

  if (shouldFetchReddit) {
    try {
      const reddit = await fetchRedditMemePayload();
      const redditMeme = normalizeRedditMeme(reddit);
      if (!redditMeme.url || reddit.nsfw || reddit.spoiler || !isValidImageUrl(redditMeme.url)) {
        throw new Error('Reddit payload not displayable');
      }
      return redditMeme;
    } catch (error) {
      console.warn('Reddit meme fetch failed, falling back to backend', error);
    }
  }

  try {
    const json = await fetchBackendMemePayload();
    if (!json?.meme) throw new Error('Unexpected Meme Capsule payload');
    const backendMeme = normalizeMeme(json.meme);
    if (!backendMeme.url || !isValidImageUrl(backendMeme.url)) {
      throw new Error('Backend meme did not include a valid image URL');
    }
    return backendMeme;
  } catch (backendError) {
    console.warn('Backend meme fetch failed, trying Reddit', backendError);
    const reddit = await fetchRedditMemePayload();
    const redditMeme = normalizeRedditMeme(reddit);
    if (!redditMeme.url || reddit.nsfw || reddit.spoiler || !isValidImageUrl(redditMeme.url)) {
      throw new Error('All meme sources failed');
    }
    return redditMeme;
  }
};

const fetchValidMeme = async (nextViewed: number, maxRetries = 10): Promise<Meme> => {
  let reportedList: string[] = [];
  try {
    reportedList = JSON.parse(localStorage.getItem('reported_memes') || '[]');
  } catch (e) {}

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const candidate = await fetchMixedMeme(nextViewed + attempt);
      if (candidate?.url && !reportedList.includes(candidate.url)) {
        const isLoaded = await preloadImage(candidate.url);
        if (isLoaded) {
          return candidate;
        }
        console.warn(`[Attempt ${attempt + 1}/${maxRetries}] Preload failed for ${candidate.url}. Retrying another source...`);
      }
    } catch (err) {
      console.warn(`[Attempt ${attempt + 1}/${maxRetries}] Fetch candidate failed:`, err);
    }
  }
  throw new Error('Could not retrieve a working image after multiple attempts.');
};

  const showToast = (text: string, type: 'primary' | 'secondary' | 'tertiary' | 'success' = 'primary') => {
    setToastText(text);
    setToastType(type);
    setTimeout(() => setToastText(null), 2500);
  };

  const showReaction = (text: string) => {
    setMemeFeedback(text);
    setShakeCard(true);
    setTimeout(() => {
      setMemeFeedback(null);
      setShakeCard(false);
    }, 1000);
  };

  // --- Emoji Reaction Handlers ---
  const handleReaction = (emoji: string) => {
    if (!meme) return;
    const key = meme.url;
    const current = memeReactions[key];
    let updated: Record<string, string>;
    if (current === emoji) {
      // Toggle off
      const { [key]: _, ...rest } = memeReactions;
      updated = rest;
    } else {
      updated = { ...memeReactions, [key]: emoji };
      // Show floating reaction animation
      setFloatingReaction(emoji);
      setShakeCard(true);
      setTimeout(() => {
        setFloatingReaction(null);
        setShakeCard(false);
      }, 900);
    }
    setMemeReactions(updated);
    localStorage.setItem('meme_reactions', JSON.stringify(updated));
    setShowReactionPicker(false);
    setShowBoardPicker(false);
    if (meme.id) {
      trackEvent(meme.id, 'reaction');
    }
  };

  // --- Swipe Handlers ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);
    setTouchDeltaY(0);
  }, [isTransitioning]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY === null || isTransitioning) return;
    const delta = e.touches[0].clientY - touchStartY;
    setTouchDeltaY(delta);
  }, [touchStartY, isTransitioning]);

  const swipeToNext = useCallback(() => {
    setShowReactionPicker(false);
    setShowBoardPicker(false);

    if (memeQueue.length > 0) {
      // INSTANT: Pop from pipeline queue front
      const [nextMeme, ...remainingQueue] = memeQueue;
      setExitDirection('up');
      setIsTransitioning(true);

      // Phase 1: Exit animation (300ms)
      setTimeout(() => {
        setExitDirection(null);
        setSwipeDirection('up');
        setImageFailed(false);
        setMeme(nextMeme);
        setMemeQueue(remainingQueue);

        const nextViewed = totalMemesViewed + 1;
        setTotalMemesViewed(nextViewed);
        setTotalMemesFetched(nextViewed);
        localStorage.setItem('total_memes_viewed', nextViewed.toString());
        localStorage.setItem('total_memes_fetched', nextViewed.toString());
        setMemeHistory(prev => [...prev.slice(-14), nextMeme]);
        setHistoryIndex(-1);

        if (nextMeme.id) trackEvent(nextMeme.id, 'view');
        void maybeShowInterstitial(nextViewed);

        // Phase 2: Enter animation done (400ms)
        setTimeout(() => {
          setSwipeDirection(null);
          setIsTransitioning(false);
        }, 400);
      }, 280);
    } else {
      // Fallback: Queue empty, do a fresh fetch with loading screen
      setIsTransitioning(true);
      fetchMeme().then(() => {
        setSwipeDirection(null);
        setIsTransitioning(false);
      });
    }
  }, [memeQueue, totalMemesViewed]);

  const swipeToPrevious = useCallback(() => {
    if (memeHistory.length === 0) return;
    setShowReactionPicker(false);
    setShowBoardPicker(false);
    const prevIdx = historyIndex === -1 ? memeHistory.length - 1 : Math.max(0, historyIndex - 1);
    const prevMeme = memeHistory[prevIdx];
    if (!prevMeme) return;

    setExitDirection('down');
    setIsTransitioning(true);

    setTimeout(() => {
      setExitDirection(null);
      setSwipeDirection('down');
      setImageFailed(false);
      setMeme(prevMeme);
      setHistoryIndex(prevIdx);

      setTimeout(() => {
        setSwipeDirection(null);
        setIsTransitioning(false);
      }, 400);
    }, 280);
  }, [memeHistory, historyIndex]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartY === null || isTransitioning) return;

    if (touchDeltaY < -SWIPE_THRESHOLD) {
      swipeToNext();
    } else if (touchDeltaY > SWIPE_THRESHOLD && memeHistory.length > 0) {
      swipeToPrevious();
    }

    setTouchStartY(null);
    setTouchDeltaY(0);
  }, [touchStartY, touchDeltaY, isTransitioning, swipeToNext, swipeToPrevious, memeHistory.length]);

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!meme) return;
    setIsSubmittingReport(true);

    try {
      // 1. Immediately blacklist locally so user never sees this meme again
      let currentBlocked: string[] = [];
      try {
        currentBlocked = JSON.parse(localStorage.getItem('reported_memes') || '[]');
      } catch (e) {}

      if (!currentBlocked.includes(meme.url)) {
        currentBlocked.push(meme.url);
        localStorage.setItem('reported_memes', JSON.stringify(currentBlocked));
      }

      // Remove from favorites if present
      if (favorites.some((f) => f.url === meme.url)) {
        const updatedFavs = favorites.filter((f) => f.url !== meme.url);
        setFavorites(updatedFavs);
        localStorage.setItem('meme_favorites', JSON.stringify(updatedFavs));
      }

      const deviceId = await getDeviceId();
      const payload = {
        meme_id: meme.id || null,
        meme_url: meme.url,
        meme_title: meme.title,
        author: meme.author,
        source: meme.source || 'Meme Capsule',
        reason,
        details,
        device_id: deviceId,
        timestamp: Date.now(),
      };

      const reportEndpoint = `${ANALYTICS_API_BASE}/api/report`;

      if (Capacitor.isNativePlatform()) {
        await CapacitorHttp.post({
          url: reportEndpoint,
          headers: { 'Content-Type': 'application/json' },
          data: payload,
          connectTimeout: 8000,
        }).catch((err) => {
          console.warn('Backend report submission error (native):', err);
        });
      } else {
        await fetch(reportEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => {
          console.warn('Backend report submission error (web):', err);
        });
      }

      showToast('REPORT FILED. CONTENT BLOCKED.', 'tertiary');
      setIsReportModalOpen(false);

      if (isMultiDropView && multiDropMemes.length > 1) {
        const remaining = multiDropMemes.filter((m) => m.url !== meme.url);
        if (remaining.length > 0) {
          setMultiDropMemes(remaining);
          setMultiDropIndex(0);
          setMeme(remaining[0]);
        } else {
          setIsMultiDropView(false);
          if (stackRef.current) {
            stackRef.current.triggerSkip();
          } else {
            swipeToNext();
          }
        }
      } else {
        if (stackRef.current) {
          stackRef.current.triggerSkip();
        } else {
          swipeToNext();
        }
      }
    } catch (err) {
      console.error('Report submission failed:', err);
      showToast('REPORT FILED LOCALLY.', 'tertiary');
      setIsReportModalOpen(false);
      if (stackRef.current) {
        stackRef.current.triggerSkip();
      } else {
        swipeToNext();
      }
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const fetchMeme = async () => {
    setScreen('loading');
    setErrorMsg('');
    setLoadProgress(0);
    setShowReactionPicker(false);
    setShowBoardPicker(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 15) + 5, 100);
      setLoadProgress(progress);
      const logIdx = Math.floor((progress / 100) * HACKER_LOGS.length);
      setCurrentLog(HACKER_LOGS[Math.min(logIdx, HACKER_LOGS.length - 1)]);
      if (progress >= 100) clearInterval(interval);
    }, 150);

    try {
      const nextViewed = totalMemesViewed + 1;
      // Fetch initial 4 cards in parallel to populate the 4 visible stack positions
      const fetchPromises = [
        fetchValidMeme(nextViewed),
        fetchValidMeme(nextViewed + 1).catch((err) => {
          console.warn('Initial stack fetch #1 failed:', err);
          return null;
        }),
        fetchValidMeme(nextViewed + 2).catch((err) => {
          console.warn('Initial stack fetch #2 failed:', err);
          return null;
        }),
        fetchValidMeme(nextViewed + 3).catch((err) => {
          console.warn('Initial stack fetch #3 failed:', err);
          return null;
        }),
      ];

      const [finalMeme, ...restResults] = await Promise.all(fetchPromises);

      clearInterval(interval);
      setLoadProgress(100);

      setTimeout(() => {
        setImageFailed(false);
        setMeme(finalMeme);
        const initialQueue = restResults.filter((m): m is Meme => m !== null);
        setMemeQueue(initialQueue);
        setScreen('viewing');
        setTotalMemesViewed(nextViewed);
        setTotalMemesFetched(nextViewed + initialQueue.length);
        localStorage.setItem('total_memes_viewed', nextViewed.toString());
        localStorage.setItem('total_memes_fetched', (nextViewed + initialQueue.length).toString());
        
        // Add to history
        setMemeHistory(prev => [...prev.slice(-14), finalMeme]);
        setHistoryIndex(-1);
        
        // Track the view event
        if (finalMeme.id) {
          trackEvent(finalMeme.id, 'view');
        }
        
        void maybeShowInterstitial(nextViewed);

        // Kick off pipeline fill in background after initial stack loads
        fillPipeline(initialQueue.length, nextViewed + initialQueue.length);
      }, 250);
    } catch (error) {
      clearInterval(interval);
      console.error('Fetch meme loop error, retrying silently...', error);
      setTimeout(() => {
        fetchMeme();
      }, 1000);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('LINK SECURED TO CLIPBOARD!', 'secondary');
  };

  const shareMeme = async (item: Meme) => {
    if (window.MemeCapsuleAndroid) {
      window.MemeCapsuleAndroid.shareImage(item.url, safeFileName(item.title), item.title);
      if (item.id) {
        trackEvent(item.id, 'share');
      }
      return;
    }

    try {
      await Share.share({
        title: item.title,
        text: `Check out this Meme Capsule drop: "${item.title}"`,
        url: item.url,
        dialogTitle: 'SHARE MEME CAPSULE DROP',
      });
      showToast('SHARED SUCCESSFULLY!', 'success');
      trackEvent(item.id || item.url, 'share');
    } catch (error) {
      if (navigator.share) {
        try {
          await navigator.share({ title: item.title, text: item.title, url: item.url });
          if (item.id) {
            trackEvent(item.id, 'share');
          }
          return;
        } catch (e) {
          copyToClipboard(item.url);
        }
      } else {
        copyToClipboard(item.url);
      }
    }
  };

  const toggleFavorite = (m: Meme) => {
    const exists = favorites.some((f) => f.url === m.url);

    // Vault limit for free users
    if (!exists && !isPro && favorites.length >= FREE_VAULT_LIMIT) {
      showToast('VAULT FULL! GO PRO FOR UNLIMITED', 'tertiary');
      setIsProModalOpen(true);
      return;
    }

    const updated = exists ? favorites.filter((f) => f.url !== m.url) : [...favorites, { ...m, savedAt: Date.now() }];
    setFavorites(updated);
    localStorage.setItem('meme_favorites', JSON.stringify(updated));
    showToast(exists ? 'REMOVED FROM VAULT' : `SECURED IN VAULT!${!isPro ? ` (${updated.length}/${FREE_VAULT_LIMIT})` : ''}`, exists ? 'tertiary' : 'success');
  };

  const handleCardDismiss = useCallback((decision: DismissDecision, dismissedMeme: Meme) => {
    setShowReactionPicker(false);
    setShowBoardPicker(false);

    // 1. Process decision feedback and events
    if (decision === 'keep') {
      showToast('KEPT! 🔥', 'secondary');
      if (dismissedMeme.id) trackEvent(dismissedMeme.id, 'keep');
    } else if (decision === 'skip') {
      showToast('SKIPPED 💨', 'tertiary');
      if (dismissedMeme.id) trackEvent(dismissedMeme.id, 'skip');
    } else if (decision === 'save') {
      toggleFavorite(dismissedMeme);
    }

    // 2. Handle multi-drop mode if active
    if (isMultiDropView && multiDropMemes.length > 1) {
      const nextIdx = multiDropIndex + 1;
      if (nextIdx < multiDropMemes.length) {
        setMultiDropIndex(nextIdx);
        setMeme(multiDropMemes[nextIdx]);
        return;
      } else {
        setIsMultiDropView(false);
        setMultiDropMemes([]);
        setMultiDropIndex(0);
      }
    }

    // 3. Advance to the next meme in the queue
    if (memeQueue.length > 0) {
      const [nextMeme, ...remainingQueue] = memeQueue;
      setImageFailed(false);
      setMeme(nextMeme);
      setMemeQueue(remainingQueue);

      const nextViewed = totalMemesViewed + 1;
      setTotalMemesViewed(nextViewed);
      setTotalMemesFetched(nextViewed);
      localStorage.setItem('total_memes_viewed', nextViewed.toString());
      localStorage.setItem('total_memes_fetched', nextViewed.toString());

      setMemeHistory((prev) => [...prev.slice(-14), nextMeme]);
      setHistoryIndex(-1);

      if (nextMeme.id) trackEvent(nextMeme.id, 'view');
      void maybeShowInterstitial(nextViewed);

      // Keep pipeline filled so position 3 always has ready content
      if (remainingQueue.length < 4) {
        fillPipeline(remainingQueue.length, nextViewed + queueFetchCounter);
      }
    } else {
      fetchMeme();
    }
  }, [
    memeQueue,
    totalMemesViewed,
    queueFetchCounter,
    isMultiDropView,
    multiDropMemes,
    multiDropIndex,
    fillPipeline,
    trackEvent,
    toggleFavorite,
    maybeShowInterstitial,
  ]);

  const createMoodBoard = () => {
    const title = boardTitle.trim() || `CHAOS BOARD ${moodBoards.length + 1}`;
    const colors: MoodBoard['color'][] = ['primary', 'secondary', 'tertiary'];
    const board: MoodBoard = {
      id: `board-${Date.now()}`,
      title: title.toUpperCase(),
      color: colors[moodBoards.length % colors.length],
      memeUrls: [],
      createdAt: Date.now(),
    };
    const updated = [board, ...moodBoards];
    setMoodBoards(updated);
    setSelectedBoardId(board.id);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updated));
    setBoardTitle('');
    setIsBoardComposerOpen(false);
    showToast('BOARD BUILT. START PINNING!', 'success');
  };

  const toggleMemeOnBoard = (boardId: string, item: Meme) => {
    let isNowPinned = false;
    const updated = moodBoards.map((board) => {
      if (board.id !== boardId) return board;
      const isPinned = board.memeUrls.includes(item.url);
      isNowPinned = !isPinned;
      return { ...board, memeUrls: isPinned ? board.memeUrls.filter((url) => url !== item.url) : [...board.memeUrls, item.url] };
    });

    if (isNowPinned && !favorites.some(f => f.url === item.url)) {
      if (!isPro && favorites.length >= FREE_VAULT_LIMIT) {
        setIsProModalOpen(true);
        showToast('VAULT LIMIT REACHED!', 'tertiary');
        return;
      }
      const newFav = { ...item, savedAt: Date.now() };
      const updatedFavs = [newFav, ...favorites];
      setFavorites(updatedFavs);
      localStorage.setItem('meme_favorites', JSON.stringify(updatedFavs));
    }

    const target = updated.find((board) => board.id === boardId);
    setMoodBoards(updated);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updated));
    showToast(isNowPinned ? 'PINNED TO BOARD!' : 'UNPINNED FROM BOARD', isNowPinned ? 'success' : 'tertiary');
  };

  const removeMoodBoard = (boardId: string) => {
    const updated = moodBoards.filter((board) => board.id !== boardId);
    setMoodBoards(updated);
    setSelectedBoardId(updated[0]?.id || null);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updated));
    showToast('BOARD DEMOLISHED', 'tertiary');
  };

  const toggleLike = (m: Meme) => {
    const exists = likedMemes.includes(m.url);
    const updated = exists ? likedMemes.filter((url) => url !== m.url) : [...likedMemes, m.url];
    setLikedMemes(updated);
    localStorage.setItem('liked_memes', JSON.stringify(updated));
    showToast(exists ? 'LIKE REMOVED' : 'MEME LIKED!', exists ? 'tertiary' : 'success');
    if (m.id) {
      trackEvent(m.id, exists ? 'unlike' : 'like');
    }
  };

  const downloadMeme = async (item: Meme) => {
    const fileName = safeFileName(item.title);

    if (window.MemeCapsuleAndroid) {
      window.MemeCapsuleAndroid.downloadImage(item.url, fileName);
      if (item.id) {
        trackEvent(item.id, 'download');
      }
      return;
    }

    try {
      const response = await fetch(item.url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      showToast('DOWNLOADED TO DEVICE GALLERY!', 'success');
      if (item.id) {
        trackEvent(item.id, 'download');
      }
    } catch (error) {
      console.error(error);
      copyToClipboard(item.url);
      showToast('DOWNLOAD BLOCKED. LINK COPIED.', 'tertiary');
    }
  };

  // --- Purchase Handlers ---
  const handlePurchasePro = async () => {
    setIsPurchasing(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { NativePurchases, PURCHASE_TYPE } = await import('@capgo/native-purchases');
        const supported = await NativePurchases.isBillingSupported();
        if (!supported) {
          showToast('BILLING NOT AVAILABLE ON THIS DEVICE', 'tertiary');
          setIsPurchasing(false);
          return;
        }

        // Fetch products first to verify it exists in Google Play
        try {
          const { products } = await NativePurchases.getProducts({
            productIdentifiers: [IAP_PRODUCT_ID],
            productType: PURCHASE_TYPE.INAPP,
          });

          if (!products || products.length === 0) {
            showToast('PRODUCT NOT FOUND IN PLAY STORE SETUP', 'tertiary');
            console.error('Product not found in Google Play Console. Check your setup.');
            setIsPurchasing(false);
            return;
          }
        } catch (fetchErr) {
          console.error('Failed to fetch product:', fetchErr);
          showToast('FAILED TO FETCH PRODUCT INFO', 'tertiary');
          setIsPurchasing(false);
          return;
        }

        // Initiate purchase
        await NativePurchases.purchaseProduct({
          productIdentifier: IAP_PRODUCT_ID,
          productType: PURCHASE_TYPE.INAPP,
          quantity: 1,
        });
      }
      
      // Purchase succeeded (or running in browser for testing)
      setIsPro(true);
      localStorage.setItem('is_pro', 'true');
      setIsProModalOpen(false);
      showToast('💎 PRO UNLOCKED! GIGACHAD MODE ACTIVATED!', 'success');
    } catch (error: any) {
      console.error('Purchase failed:', error);
      const errorMsg = error?.message?.toUpperCase() || 'FAILED';
      
      // If Google Play throws "You already own this item", we can just restore it automatically!
      if (errorMsg.includes('ALREADY OWN') || errorMsg.includes('OWNED')) {
        setIsPro(true);
        localStorage.setItem('is_pro', 'true');
        setIsProModalOpen(false);
        showToast('💎 PRO RESTORED AUTOMATICALLY!', 'success');
      } else {
        showToast(`PURCHASE CANCELLED OR ERROR: ${errorMsg.substring(0, 20)}`, 'tertiary');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchase = async () => {
    setIsPurchasing(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const { NativePurchases } = await import('@capgo/native-purchases');
        const result = await NativePurchases.restorePurchases();
        const purchases = (result as any)?.purchases || (result as any)?.items || [];
        const hasPro = Array.isArray(purchases) && purchases.some(
          (p: any) => p.productId === IAP_PRODUCT_ID || p.productIdentifier === IAP_PRODUCT_ID
        );
        if (hasPro) {
          setIsPro(true);
          localStorage.setItem('is_pro', 'true');
          setIsProModalOpen(false);
          showToast('💎 PRO RESTORED! WELCOME BACK, KING!', 'success');
        } else {
          showToast('NO PREVIOUS PURCHASE FOUND', 'tertiary');
        }
      } else {
        showToast('RESTORE ONLY WORKS ON ANDROID', 'tertiary');
      }
    } catch (error) {
      console.error('Restore failed:', error);
      showToast('RESTORE FAILED. TRY AGAIN.', 'tertiary');
    } finally {
      setIsPurchasing(false);
    }
  };

  // --- Triple Drop (Pro Feature) ---
  const fetchTripleDrop = async () => {
    if (!isPro) {
      showToast('TRIPLE DROP IS PRO ONLY!', 'tertiary');
      setIsProModalOpen(true);
      return;
    }
    setScreen('loading');
    setLoadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 20) + 8, 100);
      setLoadProgress(progress);
      const logIdx = Math.floor((progress / 100) * HACKER_LOGS.length);
      setCurrentLog(HACKER_LOGS[Math.min(logIdx, HACKER_LOGS.length - 1)]);
      if (progress >= 100) clearInterval(interval);
    }, 120);

    try {
      const nextViewed = totalMemesViewed + 1;
      const [m1, m2, m3] = await Promise.all([
        fetchValidMeme(nextViewed),
        fetchValidMeme(nextViewed + 10),
        fetchValidMeme(nextViewed + 20),
      ]);
      clearInterval(interval);
      setLoadProgress(100);
      setTimeout(() => {
        setMultiDropMemes([m1, m2, m3]);
        setMultiDropIndex(0);
        setIsMultiDropView(true);
        setMeme(m1);
        setScreen('viewing');
        const newViewed = totalMemesViewed + 3;
        setTotalMemesViewed(newViewed);
        setTotalMemesFetched(newViewed);
        localStorage.setItem('total_memes_viewed', newViewed.toString());
        localStorage.setItem('total_memes_fetched', newViewed.toString());
      }, 250);
    } catch (error) {
      clearInterval(interval);
      console.error('Triple drop failed, retrying...', error);
      setTimeout(() => fetchTripleDrop(), 1000);
    }
  };

  const getStreakTitle = () => {
    if (streak >= 100) return '🏆 MEME GOD';
    if (streak >= 30) return '👑 LEGENDARY';
    if (streak >= 7) return '🔥 ON FIRE';
    if (streak >= 3) return '⚡ RISING';
    return '🌱 FRESH';
  };

  return (
    <div className="dark min-h-screen flex flex-col font-body-md overflow-x-hidden selection:bg-primary selection:text-on-primary bg-background text-on-background">
      {toastText && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-sm py-2 border-[3px] border-outline shadow-[4px_4px_0px_0px_#000] font-label-md text-xl uppercase ${
          toastType === 'success' ? 'bg-secondary-container text-on-secondary-container' :
          toastType === 'secondary' ? 'bg-primary text-on-primary' :
          toastType === 'tertiary' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface'
        } transition-all animate-bounce`}>
          {toastText}
        </div>
      )}

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          localStorage.setItem('has_seen_onboarding', 'true');
        }}
      />

      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        onPurchase={handlePurchasePro}
        onRestore={handleRestorePurchase}
        isPurchasing={isPurchasing}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        meme={meme}
        onSubmitReport={handleSubmitReport}
        isSubmitting={isSubmittingReport}
      />

      <header className="bg-background flex flex-col justify-center items-start w-full px-md py-sm gap-xs sticky top-0 z-40 border-b-[3px] border-outline shadow-[4px_4px_0px_0px_var(--color-secondary-container)]">
        <div className="flex items-center justify-between w-full max-w-[1200px] mx-auto">
          <div className="flex items-center shrink-0">
            <div className="bg-surface-container-low border-[2px] border-outline/50 text-on-surface px-2 py-1 flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-outline)] cursor-help" title={`${streak} Day Streak — ${getStreakTitle()}`}>
              <span className="text-[14px] leading-none">{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🌱'}</span>
              <span className="font-label-xl text-[12px] uppercase mt-0.5">{streak}</span>
            </div>
          </div>
          <h1 className="font-headline-lg-mobile text-[22px] sm:text-[30px] md:font-headline-xl md:text-[60px] text-primary tracking-tighter leading-none uppercase glitch-text -skew-x-[5deg] text-stroke-yellow neo-shadow-pink text-center cursor-pointer flex-1 mx-2 truncate" onClick={() => { setActiveTab('home'); setScreen('waiting'); setMeme(null); }}>
            MEME CAPSULE
          </h1>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPro ? (
              <span className="bg-secondary-container text-on-secondary-container border-[2px] border-background px-2.5 py-1 font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] flex items-center gap-1">
                <Crown size={14} /> PRO
              </span>
            ) : (
              <button
                onClick={() => setIsProModalOpen(true)}
                className="bg-secondary-container text-on-secondary-container border-[2px] border-background px-2.5 py-1 font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 hover:brightness-110"
              >
                <Crown size={14} /> GO PRO
              </button>
            )}
            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="bg-tertiary-container text-on-tertiary-container border-[2px] border-background px-2 py-1 font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
              title="Replay Onboarding Tour"
            >
              <Sparkles size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center w-full max-w-[1200px] mx-auto px-sm py-2 gap-2 pb-24">
        {activeTab === 'home' && (
          <div className="w-full flex flex-col items-center justify-center flex-grow">
            {screen === 'waiting' && (
              <section className="w-full flex flex-col items-center justify-center flex-grow">
                {/* Hero Section — HIT ME dominates */}
                <div className="w-full max-w-[500px] flex flex-col items-center justify-center flex-grow py-6">

                  {/* Tagline — compact, above the hero */}
                  <div className="flex flex-col items-center mb-6">
                    <div className="border-[3px] border-background bg-tertiary text-on-background px-3 py-1 font-label-md text-[12px] uppercase rotate-[-3deg] shadow-[2px_2px_0px_0px_var(--color-secondary-container)] mb-3">
                      MEME NETWORK READY
                    </div>
                    <p className="font-headline-lg-mobile text-[28px] text-on-background tracking-tighter uppercase leading-none text-center">TAKE THE RISK.</p>
                    <p className="font-label-xl text-[14px] text-outline uppercase tracking-wider mt-1">ONE TAP. ONE CAPSULE DROP.</p>
                  </div>

                  {/* HIT ME — the hero button */}
                  <div className="relative w-full flex items-center justify-center mb-6">
                    {/* Pulsing glow ring behind the button */}
                    <div className="absolute inset-0 max-w-[500px] mx-auto bg-primary-container/20 border-[3px] border-primary-container/30 animate-pulse" style={{ animationDuration: '2s' }} />
                    <button
                      onClick={fetchMeme}
                      className="relative w-full bg-primary-container text-on-primary-container border-[4px] border-secondary-container shadow-[6px_6px_0px_0px_var(--color-secondary-container)] py-8 px-md flex items-center justify-center active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 group hover:bg-primary z-10"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-tertiary border-r-[3px] border-secondary-container" />
                      <span className="font-headline-xl text-[56px] sm:text-[64px] uppercase tracking-tighter group-active:scale-[0.96] transition-transform drop-shadow-[3px_3px_0px_var(--color-tertiary)]">HIT ME</span>
                    </button>
                  </div>

                  {/* Secondary actions — compact row */}
                  <div className="w-full flex gap-2">
                    <button onClick={showRewardedAdAndGetBonus} className="flex-1 bg-tertiary text-on-tertiary border-[3px] border-secondary-container shadow-[3px_3px_0px_0px_var(--color-primary-container)] py-2.5 px-3 flex items-center justify-center gap-1.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all hover:brightness-110">
                      <Sparkles size={16} className="animate-spin shrink-0" style={{ animationDuration: '3s' }} />
                      <span className="font-label-xl text-[13px] uppercase tracking-tight">{isPro ? '💎 INSTANT' : 'BONUS DROP'}</span>
                    </button>
                    <button onClick={fetchTripleDrop} className={`flex-1 border-[3px] border-secondary-container shadow-[3px_3px_0px_0px_var(--color-tertiary)] py-2.5 px-3 flex items-center justify-center gap-1.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${isPro ? 'bg-secondary-container text-on-secondary-container hover:brightness-110' : 'bg-surface-container-low text-outline'}`}>
                      <Layers size={16} className="shrink-0" />
                      <span className="font-label-xl text-[13px] uppercase tracking-tight">{isPro ? 'TRIPLE 🎰' : '🔒 TRIPLE'}</span>
                    </button>
                  </div>

                </div>
              </section>
            )}

            {screen === 'loading' && (
              <section className="w-full flex flex-col items-center justify-center flex-grow gap-lg mt-8">
                <div className="w-full max-w-[500px] text-center mb-sm">
                  <h2 className="font-headline-xl text-[64px] text-tertiary-container animate-flicker tracking-tighter uppercase leading-none drop-shadow-[4px_4px_0px_var(--color-secondary-container)]">STAND BY</h2>
                  <p className="font-label-xl text-[20px] text-secondary mt-xs bg-surface-container p-xs border-[3px] border-background uppercase leading-none">{currentLog}</p>
                </div>
                <div className="w-full max-w-[500px] aspect-square bg-surface-container-high border-[3px] border-background shadow-[8px_8px_0px_0px_var(--color-tertiary-container)] relative overflow-hidden flex flex-col">
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none mix-blend-difference">
                    <span className="font-headline-xl text-[120px] text-[#ffffff] opacity-80 timer-erratic font-bold"></span>
                  </div>
                  <div className="h-[48px] border-b-[3px] border-background bg-primary-container flex items-center px-sm">
                    <div className="h-4 w-1/2 bg-surface-container-highest loading-shimmer border-[2px] border-background"></div>
                  </div>
                  <div className="flex-grow bg-surface-container-highest relative flex flex-col justify-center items-center px-lg">
                    <div className="w-full bg-[#000] border-[3px] border-outline p-1.5 shadow-[4px_4px_0px_0px_var(--color-primary-container)]">
                      <div className="h-6 bg-gradient-to-r from-primary-container via-tertiary to-secondary-container transition-all duration-100 ease-out border-[1.5px] border-background" style={{ width: `${loadProgress}%` }}></div>
                    </div>
                    <span className="font-label-xl text-2xl text-on-surface mt-sm bg-background border-[2px] border-outline px-2 uppercase">PROG: {loadProgress}%</span>
                  </div>
                </div>
              </section>
            )}

            {screen === 'error' && (
              <section className="w-full flex flex-col items-center justify-center flex-grow gap-lg mt-8">
                <div className="w-full max-w-[500px] bg-error-container border-[3px] border-error shadow-[6px_6px_0px_0px_var(--color-on-error-container)] relative aspect-square flex flex-col justify-center items-center text-center p-md">
                  <AlertCircle size={64} className="text-on-error-container mb-4" />
                  <p className="font-headline-lg-mobile text-[36px] text-on-error-container tracking-tighter uppercase leading-none">{errorMsg}</p>
                </div>
                <button onClick={fetchMeme} className="w-full max-w-[500px] bg-tertiary-container text-on-tertiary-container border-[3px] border-secondary-container shadow-[5px_5px_0px_0px_var(--color-secondary-container)] py-sm px-md flex items-center justify-center relative active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 group mt-4">
                  <span className="font-headline-lg-mobile text-[36px] uppercase tracking-tighter group-active:scale-[0.98] transition-transform">RETRY</span>
                </button>
              </section>
            )}

            {screen === 'viewing' && meme && (
              <section className="w-full flex flex-col items-center justify-center flex-grow gap-2 mt-1">
                {/* 4-Card Stacked Deck Interactive Container */}
                <div className="w-full max-w-[500px] flex flex-col items-center relative">
                  <MemeStack
                    ref={stackRef}
                    memes={deckMemes}
                    onDismiss={handleCardDismiss}
                    isLoading={imageFailed}
                    shakeCard={shakeCard}
                    memeFeedback={memeFeedback}
                    floatingReaction={floatingReaction}
                    onDoubleTap={() => {
                      if (meme) {
                        if (!likedMemes.includes(meme.url)) {
                          toggleLike(meme);
                        }
                        showReaction('DANK! 🔥');
                      }
                    }}
                    likedMemes={likedMemes}
                    onToggleLike={toggleLike}
                    onShare={shareMeme}
                    onDownload={downloadMeme}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onOpenReport={() => setIsReportModalOpen(true)}
                    memeReactions={memeReactions}
                    onOpenReactionPicker={() => {
                      setShowReactionPicker(!showReactionPicker);
                      setShowBoardPicker(false);
                    }}
                    onOpenBoardPicker={() => {
                      if (moodBoards.length === 0) {
                        setActiveTab('boards');
                        showToast('CREATE A BOARD FIRST!', 'tertiary');
                      } else if (moodBoards.length === 1 && meme) {
                        toggleMemeOnBoard(moodBoards[0].id, meme);
                      } else {
                        setShowBoardPicker(!showBoardPicker);
                        setShowReactionPicker(false);
                      }
                    }}
                    isPinnedToBoard={(m) => Boolean(selectedBoardId && moodBoards.find((b) => b.id === selectedBoardId)?.memeUrls.includes(m.url))}
                    onLongPress={downloadMeme}
                  />

                  {/* Reaction Picker Overlay */}
                  {showReactionPicker && meme && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex items-center gap-1 bg-surface-container-highest/95 border-[3px] border-primary-container shadow-[4px_4px_0px_0px_var(--color-tertiary)] px-2 py-2 backdrop-blur-md">
                      {MEME_REACTIONS.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={(e) => { e.stopPropagation(); handleReaction(r.emoji); }}
                          className={`flex flex-col items-center px-1.5 py-1 transition-all hover:scale-125 active:scale-90 ${
                            memeReactions[meme.url] === r.emoji ? 'bg-primary-container/50 border-[2px] border-secondary-container' : 'border-[2px] border-transparent'
                          }`}
                          title={r.label}
                        >
                          <span className="text-[28px] leading-none animate-reaction-pop">{r.emoji}</span>
                          <span className="font-label-md text-[9px] text-outline uppercase mt-0.5">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Board Picker Overlay */}
                  {showBoardPicker && moodBoards.length > 0 && meme && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex flex-col gap-1 bg-surface-container-highest/95 border-[3px] border-primary-container shadow-[4px_4px_0px_0px_var(--color-tertiary)] px-2 py-2 backdrop-blur-md min-w-[200px] max-w-[280px]">
                      <span className="font-label-xl text-[11px] text-outline uppercase tracking-wider px-1 mb-1">PIN TO BOARD</span>
                      {moodBoards.map((board) => {
                        const isPinned = board.memeUrls.includes(meme.url);
                        return (
                          <button
                            key={board.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMemeOnBoard(board.id, meme);
                              setSelectedBoardId(board.id);
                              setShowBoardPicker(false);
                            }}
                            className={`flex items-center justify-between gap-2 px-2 py-1.5 transition-all text-left ${
                              isPinned
                                ? 'bg-primary-container/60 border-[2px] border-secondary-container'
                                : 'border-[2px] border-transparent hover:bg-surface-container-low'
                            }`}
                          >
                            <span className="font-label-xl text-[13px] text-on-surface uppercase truncate">{board.title}</span>
                            {isPinned && <span className="text-[16px] leading-none">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Off-screen Image Preloader for the 4 visible cards */}
                  <div className="hidden" aria-hidden="true">
                    {deckMemes.slice(0, 4).map((m) => (
                      <img key={m.url} src={m.url} alt="" />
                    ))}
                  </div>
                </div>

                  {/* Multi-Drop Gallery Navigation (if triple drop active) */}
                  {isMultiDropView && multiDropMemes.length > 1 && (
                    <div className="w-full max-w-[380px] bg-surface-container-low border-[3px] border-secondary-container shadow-[3px_3px_0px_0px_var(--color-primary-container)] p-2 flex items-center justify-between mt-2">
                      <button
                        onClick={() => {
                          const newIdx = Math.max(0, multiDropIndex - 1);
                          setMultiDropIndex(newIdx);
                          setMeme(multiDropMemes[newIdx]);
                          setImageFailed(false);
                        }}
                        disabled={multiDropIndex === 0}
                        className="bg-primary text-on-primary border-[2px] border-background px-3 py-1 font-label-xl text-[14px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30"
                      >
                        ◀ PREV
                      </button>
                      <div className="flex items-center gap-2">
                        {multiDropMemes.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => { setMultiDropIndex(idx); setMeme(multiDropMemes[idx]); setImageFailed(false); }}
                            className={`w-6 h-6 border-[2px] border-background font-label-md text-[12px] flex items-center justify-center transition-all ${idx === multiDropIndex ? 'bg-secondary-container text-on-secondary-container scale-110' : 'bg-surface-container-high text-outline'}`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const newIdx = Math.min(multiDropMemes.length - 1, multiDropIndex + 1);
                          setMultiDropIndex(newIdx);
                          setMeme(multiDropMemes[newIdx]);
                          setImageFailed(false);
                        }}
                        disabled={multiDropIndex === multiDropMemes.length - 1}
                        className="bg-primary text-on-primary border-[2px] border-background px-3 py-1 font-label-xl text-[14px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-30"
                      >
                        NEXT ▶
                      </button>
                    </div>
                  )}
              </section>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <section className="w-full max-w-[600px] flex flex-col gap-md animate-in slide-in-from-bottom-6 duration-200">
            <div className="bg-surface-container border-[4px] border-tertiary shadow-[6px_6px_0px_0px_var(--color-primary-container)] p-md flex flex-col gap-md">
              <div className="border-b-[3px] border-outline pb-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-sm">
                <h2 className="font-headline-xl text-[38px] text-tertiary tracking-tighter uppercase leading-none skew-x-[-3deg]">MEME VAULT</h2>
                <input type="text" value={searchFavQuery} onChange={(e) => setSearchFavQuery(e.target.value)} placeholder="SEARCH VAULT..." className="bg-surface-container-low border-[2px] border-outline font-label-md px-3 py-1.5 uppercase focus:outline-none focus:border-tertiary text-[14px]" />
              </div>

              <div className="grid grid-cols-3 gap-xs">
                <div className="bg-surface-container-low border-[3px] border-outline p-xs text-center">
                  <span className="block font-label-md text-[11px] text-outline uppercase">Viewed</span>
                  <span className="block font-headline-xl text-[28px] text-primary uppercase leading-none">{totalMemesViewed}</span>
                </div>
                <div className="bg-surface-container-low border-[3px] border-outline p-xs text-center">
                  <span className="block font-label-md text-[11px] text-outline uppercase">Fetched</span>
                  <span className="block font-headline-xl text-[28px] text-secondary-container uppercase leading-none">{totalMemesFetched}</span>
                </div>
                <div className="bg-surface-container-low border-[3px] border-outline p-xs text-center">
                  <span className="block font-label-md text-[11px] text-outline uppercase">Liked</span>
                  <span className="block font-headline-xl text-[28px] text-tertiary uppercase leading-none">{likedMemes.length}</span>
                </div>
              </div>

              {favorites.length === 0 ? (
                <div className="border-[3px] border-dashed border-outline py-xl text-center flex flex-col items-center justify-center bg-surface-container-low gap-sm">
                  <Smile size={48} className="text-outline animate-spin" style={{ animationDuration: '4s' }} />
                  <p className="font-label-xl text-[20px] text-outline uppercase">YOUR VAULT IS SECURELY EMPTY.</p>
                  <button onClick={() => setActiveTab('home')} className="bg-primary text-on-primary border-[2px] border-background px-4 py-1.5 font-label-xl text-[16px] uppercase shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all mt-xs">GO LOAD MEMES</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm max-h-[60vh] overflow-y-auto pr-xs">
                  {favorites.filter((f) => f.title.toLowerCase().includes(searchFavQuery.toLowerCase())).map((fav) => (
                    <div key={fav.url} className="bg-surface-container-low border-[3px] border-outline p-xs flex flex-col gap-xs relative shadow-[3px_3px_0px_0px_#000]">
                      <div className="h-[140px] bg-background border-[2px] border-outline overflow-hidden flex items-center justify-center relative">
                        <img src={fav.url} alt={fav.title} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-label-md text-[15px] uppercase truncate font-bold text-on-surface block" title={fav.title}>{fav.title}</span>
                      <div className="flex justify-between items-center gap-xs mt-auto border-t border-outline/30 pt-xs">
                        <span className="font-label-md text-[11px] text-outline uppercase truncate max-w-[100px]">@{fav.author}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => downloadMeme(fav)} title="Download to gallery" className="bg-primary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><Download size={16} className="text-on-primary" /></button>
                          <button onClick={() => shareMeme(fav)} className="bg-secondary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><Share2 size={16} className="text-[#000]" /></button>
                          <button onClick={() => {
                            if (moodBoards.length === 0) {
                              setActiveTab('boards');
                              showToast('CREATE A BOARD FIRST!', 'tertiary');
                            } else if (moodBoards.length === 1) {
                              toggleMemeOnBoard(moodBoards[0].id, fav);
                            } else if (selectedBoardId) {
                              toggleMemeOnBoard(selectedBoardId, fav);
                            } else {
                              setActiveTab('boards');
                              showToast('SELECT A BOARD FIRST!', 'tertiary');
                            }
                          }} title={selectedBoardId ? `Pin to ${moodBoards.find(b => b.id === selectedBoardId)?.title || 'board'}` : 'Pin to mood board'} className="bg-tertiary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><LayoutGrid size={16} className="text-on-tertiary" /></button>
                          <button onClick={() => {
                            const updated = favorites.filter((f) => f.url !== fav.url);
                            setFavorites(updated);
                            localStorage.setItem('meme_favorites', JSON.stringify(updated));
                            showToast('DELETED FROM VAULT', 'tertiary');
                          }} className="bg-error-container p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><Trash2 size={16} className="text-on-error-container" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'boards' && (() => {
          const selectedBoard = moodBoards.find((board) => board.id === selectedBoardId) || null;
          const pinnedMemes = selectedBoard ? selectedBoard.memeUrls.map((url) => favorites.find((fav) => fav.url === url)).filter((m): m is Meme => Boolean(m)) : [];
          const boardColor = selectedBoard?.color === 'secondary' ? 'border-secondary-container shadow-[6px_6px_0px_0px_var(--color-tertiary)]' : selectedBoard?.color === 'tertiary' ? 'border-tertiary shadow-[6px_6px_0px_0px_var(--color-primary-container)]' : 'border-primary shadow-[6px_6px_0px_0px_var(--color-secondary-container)]';
          return (
            <section className="w-full max-w-[900px] flex flex-col gap-md animate-in slide-in-from-bottom-6 duration-200">
              <div className="flex items-end justify-between gap-sm border-b-[3px] border-outline pb-sm">
                <div>
                  <span className="font-label-md text-[13px] text-secondary-container uppercase">YOUR PERSONAL ARCHIVE</span>
                  <h2 className="font-headline-xl text-[42px] text-primary tracking-tighter uppercase leading-none skew-x-[-3deg]">MOOD BOARDS</h2>
                </div>
                <button onClick={() => setIsBoardComposerOpen(true)} className="bg-secondary-container text-on-secondary-container border-[3px] border-background px-3 py-2 font-label-xl text-[16px] uppercase shadow-[3px_3px_0px_0px_var(--color-primary-container)] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-1"><Plus size={18} /> NEW</button>
              </div>

              {isBoardComposerOpen && (
                <form onSubmit={(e) => { e.preventDefault(); createMoodBoard(); }} className="bg-tertiary-container border-[3px] border-secondary-container shadow-[5px_5px_0px_0px_var(--color-primary-container)] p-sm flex flex-col sm:flex-row gap-sm">
                  <input autoFocus value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="NAME YOUR VIBE..." maxLength={28} className="flex-1 bg-surface-container-low border-[3px] border-background px-sm py-2 font-label-xl uppercase text-on-surface focus:outline-none focus:border-secondary-container" />
                  <div className="flex gap-xs"><button type="submit" className="bg-secondary-container text-on-secondary-container border-[3px] border-background px-3 font-label-xl uppercase">BUILD IT</button><button type="button" onClick={() => setIsBoardComposerOpen(false)} className="bg-surface-container-high border-[3px] border-background px-3 text-on-surface"><X size={20} /></button></div>
                </form>
              )}

              {moodBoards.length === 0 ? (
                <div className="bg-surface-container border-[4px] border-dashed border-primary-container shadow-[6px_6px_0px_0px_var(--color-secondary-container)] py-xl px-md text-center flex flex-col items-center gap-sm">
                  <LayoutGrid size={58} className="text-primary" />
                  <h3 className="font-headline-xl text-[32px] uppercase text-on-surface leading-none">MAKE THE ALGORITHM JEALOUS.</h3>
                  <p className="font-label-md text-outline uppercase max-w-[380px]">Collect the memes that define a mood, a phase, or a very specific 3 AM thought.</p>
                  <button onClick={() => setIsBoardComposerOpen(true)} className="bg-primary text-on-primary border-[3px] border-background px-5 py-2 font-label-xl uppercase shadow-[3px_3px_0px_0px_var(--color-tertiary)] active:translate-x-1 active:translate-y-1 active:shadow-none">CREATE FIRST BOARD</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-md items-start">
                  <aside className="flex lg:flex-col gap-xs overflow-x-auto lg:overflow-visible pb-1">
                    {moodBoards.map((board) => (
                      <button key={board.id} onClick={() => setSelectedBoardId(board.id)} className={`min-w-[180px] text-left border-[3px] p-sm transition-all ${selectedBoardId === board.id ? 'bg-primary-container border-secondary-container text-on-primary-container shadow-[4px_4px_0px_0px_var(--color-secondary-container)] -translate-y-0.5' : 'bg-surface-container border-outline text-on-surface hover:border-primary'}`}>
                        <span className="font-label-md text-[11px] opacity-70 uppercase">{board.memeUrls.length} PINS</span>
                        <span className="block font-headline-xl text-[24px] uppercase leading-none truncate">{board.title}</span>
                      </button>
                    ))}
                  </aside>
                  {selectedBoard && <div className={`bg-surface-container border-[4px] ${boardColor} p-sm`}>
                    <div className="flex justify-between items-start gap-sm border-b-[3px] border-outline pb-sm mb-sm"><div><span className="font-label-md text-[12px] text-secondary-container uppercase">PINNED ENERGY</span><h3 className="font-headline-xl text-[34px] text-on-surface uppercase leading-none">{selectedBoard.title}</h3></div><button onClick={() => removeMoodBoard(selectedBoard.id)} title="Delete board" className="bg-error-container text-on-error-container border-[2px] border-background p-1.5 shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"><Trash2 size={17} /></button></div>
                    {pinnedMemes.length === 0 ? <div className="border-[3px] border-dashed border-outline p-lg text-center"><p className="font-label-xl text-[20px] text-outline uppercase">NO PINS YET. HIT THE GRID ICON ON A MEME.</p><button onClick={() => setActiveTab('home')} className="mt-sm bg-secondary-container text-on-secondary-container border-[2px] border-background px-3 py-1.5 font-label-xl uppercase">FIND MEMES</button></div> : <div className="columns-2 sm:columns-3 gap-sm">{pinnedMemes.map((item) => <article key={item.url} className="break-inside-avoid mb-sm bg-surface-container-low border-[3px] border-outline shadow-[3px_3px_0px_0px_#000] p-1.5 relative group"><img src={item.url} alt={item.title} className="w-full max-h-[240px] object-cover border-[2px] border-background" /><p className="font-label-md text-[11px] text-on-surface uppercase leading-tight p-1 truncate">{item.title}</p><button onClick={() => toggleMemeOnBoard(selectedBoard.id, item)} className="absolute right-2 top-2 bg-tertiary-container text-on-tertiary-container border-[2px] border-background p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><X size={14} /></button></article>)}</div>}
                  </div>}
                </div>
              )}
            </section>
          );
        })()}
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center h-[68px] px-sm pb-safe bg-surface-container-highest border-t-[3px] border-outline md:max-w-[500px] md:left-1/2 md:-translate-x-1/2 md:border-x-[3px] md:bottom-md md:rounded-lg shadow-[0px_-4px_16px_0px_rgba(0,0,0,0.5)]">
        <button onClick={() => { if (activeTab === 'home') { setScreen('waiting'); setMeme(null); } else { setActiveTab('home'); } }} className={`rounded-none px-8 py-2 border-[2px] border-background flex flex-col items-center justify-center scale-95 transition-transform duration-100 cursor-pointer ${activeTab === 'home' ? 'bg-primary text-on-primary shadow-[2px_2px_0px_0px_var(--color-secondary-container)] -translate-y-1.5' : 'text-on-surface opacity-70 hover:bg-secondary-container hover:text-[#000]'}`}>
          <Home size={28} />
        </button>
        <button onClick={() => setActiveTab('favorites')} className={`rounded-none px-8 py-2 border-[2px] border-background flex flex-col items-center justify-center scale-95 transition-transform duration-100 cursor-pointer ${activeTab === 'favorites' ? 'bg-primary text-on-primary shadow-[2px_2px_0px_0px_var(--color-secondary-container)] -translate-y-1.5' : 'text-on-surface opacity-70 hover:bg-secondary-container hover:text-[#000]'}`}>
          <Flame size={28} />
        </button>
        <button onClick={() => setActiveTab('boards')} className={`rounded-none px-6 py-2 border-[2px] border-background flex flex-col items-center justify-center scale-95 transition-transform duration-100 cursor-pointer ${activeTab === 'boards' ? 'bg-primary text-on-primary shadow-[2px_2px_0px_0px_var(--color-secondary-container)] -translate-y-1.5' : 'text-on-surface opacity-70 hover:bg-secondary-container hover:text-[#000]'}`}>
          <LayoutGrid size={26} />
        </button>
      </nav>
    </div>
  );
}
