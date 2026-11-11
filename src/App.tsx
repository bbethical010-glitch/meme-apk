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
  Heart,
  Home,
  Layers,
  LayoutGrid,
  Lock,
  MapPin,
  Plus,
  Share2,
  Smile,
  Trash2,
  User,
  X,
  Sparkles,
  Flag,
  Shield,
  Settings,
  RotateCcw,
  ExternalLink,
  HelpCircle,
  Check,
  Zap,
  MoreVertical,
  Star,
  Calendar,
  BarChart3,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { Share } from '@capacitor/share';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { maybeShowScreenTransitionInterstitial, setBannerVisible } from './monetization/ads';
import { AD_UNITS } from './monetization/adsConfig';
import { showRewardedAd } from './monetization/rewardedAds';
import { canCreateBoard, FREE_BOARD_LIMIT, getAdFreeExpiry, grantBonusBoard, isInAdFreeWindow, resetBonusBoards, startRewardSession } from './monetization/rewards';
import { MONETIZATION_CHANGED, MONETIZATION_TOAST } from './monetization/events';
import StoreScreen from './components/store/StoreScreen';
import { ARCADE_FX_STYLES, getActiveFx, setActiveFx, FX_CHANGED, type ArcadeFxStyle } from './monetization/arcadeFx';
import ProductPurchase from './components/ProductPurchase';
import ThemePicker, { THEME_CHANGED, THEME_KEY } from './components/ThemePicker';
import { useEntitlements } from './monetization/hooks';
import { getEntitlements, hasRemovedAds } from './monetization/entitlements';
import { restorePurchases } from './monetization/purchases';
import { PRODUCTS, type ProductId } from './monetization/products';
import './monetization/themes.css';
import { useAnalytics, ANALYTICS_API_BASE, getDeviceId } from './analytics';
import OnboardingModal from './OnboardingModal';
import ReportModal from './ReportModal';
import RedditInfoModal from './RedditInfoModal';
import UnpinModal from './UnpinModal';
import CreateBoardModal from './CreateBoardModal';
import ShareModal, { buildMemeShareMessage } from './ShareModal';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import PrivacyConsentModal from './components/PrivacyConsentModal';
import RatingModal from './components/RatingModal';
import DateOfBirthModal from './components/DateOfBirthModal';
import { MemeStack, MemeStackRef } from './components/MemeStack';
import { memeDimensionCache, computeCanvasDimensions, CanvasDimensions } from './utils/dimensions';
import { initPushNotifications } from './services/pushNotifications';
import type { Meme, MoodBoard, DismissDecision } from './types';

export type { Meme, MoodBoard };

declare global {
  interface Window {
    MemeCapsuleAndroid?: {
      downloadImage: (url: string, fileName: string) => void;
      shareImage: (url: string, fileName: string, title: string) => void;
      shareImageToApp?: (url: string, fileName: string, shareText: string, targetPackage: string) => void;
      shouldRestoreRunningSession?: () => boolean;
      openPlayStoreListing?: () => void;
    };
  }
}

const RANDOM_MEME_ENDPOINT = 'https://meme-capsule-eww.pages.dev/api/random-meme';
const REDDIT_MEME_ENDPOINT = 'https://meme-api.com/gimme';
const FREE_VAULT_LIMIT = 100;

const getBoardHex = (color?: string): string => {
  if (!color) return '#f4c300';
  if (color === 'primary') return '#9b30ff';
  if (color === 'secondary') return '#f4c300';
  if (color === 'tertiary') return '#ff007f';
  return color;
};

type BackendMemePayload = {
  id?: string;
  title?: string;
  url?: string;
  image?: string;
  category?: string;
  status?: string;
  is_active?: number | boolean;
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
  postLink: data.postLink || (data.subreddit ? `https://reddit.com/r/${data.subreddit}` : undefined),
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

const fetchBackendMemePayload = (excludeIds?: string[]) => {
  const url = new URL(RANDOM_MEME_ENDPOINT);
  url.searchParams.set('_ts', String(Date.now()));
  url.searchParams.set('_nonce', Math.random().toString(36).substring(2, 9));
  if (excludeIds && excludeIds.length > 0) {
    url.searchParams.set('exclude', excludeIds.slice(0, 50).join(','));
  }
  return fetchJson(url.toString());
};
const fetchRedditMemePayload = () => {
  const url = new URL(REDDIT_MEME_ENDPOINT);
  url.searchParams.set('_ts', String(Date.now()));
  return fetchJson(url.toString());
};

const safeFileName = (title?: string) =>
  `${(title || 'meme-capsule').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'meme-capsule'}.jpg`;

type TabType = 'home' | 'favorites' | 'boards' | 'settings';
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
const STACK_BATCH_SIZE = 10;
const PIPELINE_TARGET_SIZE = 12;
const PIPELINE_INITIAL_BATCH = 5;
const STACK_PREFETCH_CONSUMPTION_RATIO = 0.6; // Trigger next stack fetch when 60%-70% of loaded memes are viewed
const FIFO_REFILL_TRIGGER_SIZE = Math.ceil(STACK_BATCH_SIZE * (1 - STACK_PREFETCH_CONSUMPTION_RATIO)); // 4 memes remaining
const ACTIVE_SESSION_STORAGE_KEY = 'meme_capsule_active_session_v1';
const SHARE_HANDOFF_STORAGE_KEY = 'meme_capsule_share_handoff_v1';
const SEEN_MEMES_STORAGE_KEY = 'meme_capsule_seen_urls_v2';
const SEEN_MEME_IDS_STORAGE_KEY = 'meme_capsule_seen_ids_v2';
const LEGACY_SEEN_MEMES_STORAGE_KEY = 'meme_capsule_seen_urls_v1';

interface ActiveSessionSnapshot {
  meme: Meme | null;
  screen: ScreenState;
  memeQueue: Meme[];
  memeHistory: Meme[];
  historyIndex: number;
  activeTab: TabType;
  multiDropMemes: Meme[];
  multiDropIndex: number;
  isMultiDropView: boolean;
  dimensions?: Record<string, { width: number; height: number }>;
  savedAt: number;
}

function loadPersistedSession(): ActiveSessionSnapshot | null {
  try {
    // Always remove any legacy disk-persisted key from v3.0/v3.1 so closing background apps never forces an old meme on cold start
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);

    // Check native Android process/task state: if the app was removed from running background apps and cold-launched, start on Homepage
    if (
      typeof window !== 'undefined' &&
      window.MemeCapsuleAndroid &&
      typeof window.MemeCapsuleAndroid.shouldRestoreRunningSession === 'function'
    ) {
      const shouldRestore = window.MemeCapsuleAndroid.shouldRestoreRunningSession();
      if (!shouldRestore) {
        sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
        return null;
      }
    }

    // 1. Primary: sessionStorage (survives switching between running apps, automatically wiped when app is closed from Recents)
    let raw = sessionStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);

    // 2. Fallback: One-time short-lived share handoff (only if returning from an external share intent within 2 minutes)
    if (!raw) {
      const handoffRaw = localStorage.getItem(SHARE_HANDOFF_STORAGE_KEY);
      if (handoffRaw) {
        localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
        const handoffParsed = JSON.parse(handoffRaw) as ActiveSessionSnapshot;
        if (handoffParsed && handoffParsed.savedAt && Date.now() - handoffParsed.savedAt < 120_000) {
          raw = handoffRaw;
          sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, handoffRaw);
        }
      }
    } else {
      localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
    }

    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSessionSnapshot;
    if (!parsed || !parsed.meme || !parsed.meme.url) return null;

    let reportedList: string[] = [];
    try {
      reportedList = JSON.parse(localStorage.getItem('reported_memes') || '[]');
    } catch {
      reportedList = [];
    }
    if (reportedList.includes(parsed.meme.url)) return null;

    if (parsed.dimensions && typeof parsed.dimensions === 'object') {
      for (const [url, dims] of Object.entries(parsed.dimensions)) {
        if (dims && typeof dims.width === 'number' && typeof dims.height === 'number' && dims.width > 0 && dims.height > 0) {
          memeDimensionCache.set(url, dims);
        }
      }
    }

    const filteredQueue = Array.isArray(parsed.memeQueue)
      ? parsed.memeQueue.filter((m) => m && m.url && !reportedList.includes(m.url))
      : [];
    const filteredHistory = Array.isArray(parsed.memeHistory)
      ? parsed.memeHistory.filter((m) => m && m.url && !reportedList.includes(m.url))
      : [parsed.meme];

    return {
      meme: parsed.meme,
      screen: 'viewing',
      memeQueue: filteredQueue,
      memeHistory: filteredHistory.length > 0 ? filteredHistory : [parsed.meme],
      historyIndex: typeof parsed.historyIndex === 'number' ? parsed.historyIndex : -1,
      activeTab:
        parsed.activeTab && ['home', 'favorites', 'boards'].includes(parsed.activeTab)
          ? parsed.activeTab
          : 'home',
      multiDropMemes: Array.isArray(parsed.multiDropMemes) ? parsed.multiDropMemes : [],
      multiDropIndex: typeof parsed.multiDropIndex === 'number' ? parsed.multiDropIndex : 0,
      isMultiDropView: Boolean(parsed.isMultiDropView),
      dimensions: parsed.dimensions || {},
      savedAt: parsed.savedAt || Date.now(),
    };
  } catch (err) {
    console.warn('Failed to restore active meme session:', err);
    return null;
  }
}

export default function App() {
  const {
    consent,
    updateConsent,
    diagnostics,
    refreshDiagnostics,
    flushQueue,
    trackEvent,
    trackScreenView,
    trackMemeView,
    trackMemeLike,
    trackMemeShare,
    trackMemeSave,
    trackMemeScroll,
    trackCategoryClick,
    trackOnboardingComplete,
    trackProfileOpen,
    trackSubscriptionClick,
    trackFeedRefresh,
    trackMemeReported,
    trackAdImpression,
    trackAdRewardViewed,
    trackRetentionCheckin,
  } = useAnalytics();
  const [isDebugInspectorOpen, setIsDebugInspectorOpen] = useState(false);
  const initialSessionRef = useRef<ActiveSessionSnapshot | null | undefined>(undefined);
  if (initialSessionRef.current === undefined) {
    initialSessionRef.current = loadPersistedSession();
  }
  const hydratedSession = initialSessionRef.current;

  const [activeTab, setActiveTab] = useState<TabType>(() => hydratedSession?.activeTab || 'home');
  const [screen, setScreen] = useState<ScreenState>(() => (hydratedSession?.meme ? 'viewing' : 'waiting'));
  const [meme, setMeme] = useState<Meme | null>(() => hydratedSession?.meme || null);
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
  const [rewardBusy, setRewardBusy] = useState(false);
  const rewardBusyRef = useRef(false);
  const [boardLimitReached, setBoardLimitReached] = useState(false);
  const [, refreshPerks] = useState(0);
  const [isDobModalOpen, setIsDobModalOpen] = useState(false);
  const [userDob, setUserDob] = useState<string | null>(() => localStorage.getItem('meme_capsule_user_dob'));
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const { entitlements, busy: isPurchasing } = useEntitlements();
  const isPro = entitlements.legacyCollectionAccess;
  const [storeFocus, setStoreFocus] = useState<ProductId | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const openStore = useCallback((opts?: { focus?: ProductId }) => {
    trackSubscriptionClick(opts?.focus ?? undefined);
    trackScreenView('store');
    setStoreFocus(opts?.focus ?? null);
    setIsStoreOpen(true);
  }, [trackSubscriptionClick, trackScreenView]);
  const closeStore = useCallback(() => {
    if (window.history.state?.memeCapsuleStore) window.history.back();
    else {
      setIsStoreOpen(false);
      setStoreFocus(null);
    }
  }, []);
  const [activeFx, setActiveFxState] = useState<ArcadeFxStyle>(() => getActiveFx(entitlements.ownedFx));
  useEffect(() => {
    const update = () => setActiveFxState(getActiveFx(entitlements.ownedFx));
    window.addEventListener(FX_CHANGED, update);
    return () => window.removeEventListener(FX_CHANGED, update);
  }, [entitlements.ownedFx]);
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'classic');
  const activeTheme = entitlements.ownedThemes.includes(selectedTheme) ? selectedTheme : 'classic';
  const [streak, setStreak] = useState(1);
  const [multiDropMemes, setMultiDropMemes] = useState<Meme[]>(() => hydratedSession?.multiDropMemes || []);
  const [multiDropIndex, setMultiDropIndex] = useState<number>(() => hydratedSession?.multiDropIndex || 0);
  const [isMultiDropView, setIsMultiDropView] = useState<boolean>(() => hydratedSession?.isMultiDropView || false);
  const [canvasDimensions, setCanvasDimensions] = useState<CanvasDimensions>(() => {
    const initialUrl = hydratedSession?.meme?.url;
    const cached = initialUrl ? memeDimensionCache.get(initialUrl) : undefined;
    return computeCanvasDimensions(cached?.width, cached?.height);
  });

  // Settings & History Preferences
  const [redditStreamEnabled, setRedditStreamEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pref_reddit_stream') !== 'false';
  });
  const [shakeEffectsEnabled, setShakeEffectsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pref_shake_effects') !== 'false';
  });
  const [prefetchEnabled, setPrefetchEnabled] = useState<boolean>(() => {
    return localStorage.getItem('pref_prefetch_buffer') !== 'false';
  });
  const [blockedMemesCount, setBlockedMemesCount] = useState<number>(() => {
    try {
      const list = JSON.parse(localStorage.getItem('reported_memes') || '[]');
      return Array.isArray(list) ? list.length : 0;
    } catch {
      return 0;
    }
  });
  const [confirmWipeMode, setConfirmWipeMode] = useState<'none' | 'history' | 'vault' | 'all'>('none');
  const [settingsTab, setSettingsTab] = useState<'experience' | 'membership' | 'privacy'>('experience');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [ctaEffects, setCtaEffects] = useState<{
    key: 'like' | 'vault' | 'pin' | 'more' | null;
    tick: number;
    x: number;
    y: number;
    size: number;
    color: string;
  }>({ key: null, tick: 0, x: 0, y: 0, size: 0, color: '#FF2A85' });

  const triggerCtaEffect = useCallback((
    key: 'like' | 'vault' | 'pin' | 'more',
    color: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = (e.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    setCtaEffects({ key, tick: Date.now(), x, y, size, color });
  }, []);

  const handleDimensionsLoaded = useCallback((dims: { width: number; height: number }) => {
    if (meme?.url) {
      memeDimensionCache.set(meme.url, dims);
    }
    setCanvasDimensions(computeCanvasDimensions(dims.width, dims.height));
  }, [meme?.url]);

  useEffect(() => {
    if (meme?.url) {
      const cached = memeDimensionCache.get(meme.url);
      if (cached) {
        setCanvasDimensions(computeCanvasDimensions(cached.width, cached.height));
      }
    }
  }, [meme?.url]);

  useEffect(() => {
    const handleResize = () => {
      if (meme?.url) {
        const cached = memeDimensionCache.get(meme.url);
        setCanvasDimensions(computeCanvasDimensions(cached?.width, cached?.height));
      } else {
        setCanvasDimensions(computeCanvasDimensions());
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [meme?.url]);

  // Global prevention of text selection and copying across non-input elements
  useEffect(() => {
    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('copy', preventSelection);

    return () => {
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('copy', preventSelection);
    };
  }, []);

  // Reaction state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [memeReactions, setMemeReactions] = useState<Record<string, string>>({});
  const [floatingReaction, setFloatingReaction] = useState<string | null>(null);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [redditInfoMeme, setRedditInfoMeme] = useState<Meme | null>(null);
  const [isRedditInfoOpen, setIsRedditInfoOpen] = useState(false);

  // Swipe state
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchDeltaY, setTouchDeltaY] = useState(0);
  const [memeHistory, setMemeHistory] = useState<Meme[]>(() => hydratedSession?.memeHistory || []);
  const [historyIndex, setHistoryIndex] = useState<number>(() => hydratedSession?.historyIndex ?? -1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'up' | 'down' | null>(null);
  const [exitDirection, setExitDirection] = useState<'up' | 'down' | null>(null);
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<MemeStackRef>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ctaLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLikeLongPressRef = useRef(false);
  const [isLikePressing, setIsLikePressing] = useState(false);
  const likeScaleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinnedMemes, setPinnedMemes] = useState<Meme[]>([]);
  const [unpinTargetMeme, setUnpinTargetMeme] = useState<Meme | null>(null);
  const [reportTargetMeme, setReportTargetMeme] = useState<Meme | null>(null);
  const [shareTargetMeme, setShareTargetMeme] = useState<Meme | null>(null);
  const unpinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [memeQueue, setMemeQueue] = useState<Meme[]>(() => hydratedSession?.memeQueue || []);
  const [queueFetchCounter, setQueueFetchCounter] = useState(0);
  const isFillingQueue = useRef(false);
  const pendingRefillRef = useRef(false);
  const memeQueueRef = useRef<Meme[]>(memeQueue);
  memeQueueRef.current = memeQueue;
  const stackBatchTotalRef = useRef<number>(
    Math.max(STACK_BATCH_SIZE, (hydratedSession?.memeQueue?.length || 0) + 1)
  );
  const stackBatchViewedRef = useRef<number>(0);
  const fetchSeedCursorRef = useRef<number>(0);

  // Active session snapshot persistence (prevents losing active meme & queue when sharing to external apps or backgrounding)
  const sessionStateRef = useRef({
    meme,
    screen,
    memeQueue,
    memeHistory,
    historyIndex,
    activeTab,
    multiDropMemes,
    multiDropIndex,
    isMultiDropView,
  });
  sessionStateRef.current = {
    meme,
    screen,
    memeQueue,
    memeHistory,
    historyIndex,
    activeTab,
    multiDropMemes,
    multiDropIndex,
    isMultiDropView,
  };

  // --- Persistent Seen-Memes Deduplication (prevents repeats across sessions) ---
  const seenMemeUrlsInitRef = useRef(false);
  const seenMemeUrlsRef = useRef<Set<string>>(new Set<string>());
  const seenMemeIdsRef = useRef<Set<string>>(new Set<string>());
  const seenMemeIdsListRef = useRef<string[]>([]);
  const inFlightUrlsRef = useRef<Set<string>>(new Set<string>());
  const inFlightIdsRef = useRef<Set<string>>(new Set<string>());

  if (!seenMemeUrlsInitRef.current) {
    try {
      // 1. Load seen URLs (v2, with fallback to legacy v1)
      const storedUrls = JSON.parse(
        localStorage.getItem(SEEN_MEMES_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_SEEN_MEMES_STORAGE_KEY) ||
        '[]'
      );
      const validStoredUrls = Array.isArray(storedUrls)
        ? storedUrls.filter((u): u is string => typeof u === 'string')
        : [];
      seenMemeUrlsRef.current = new Set<string>(validStoredUrls);

      // 2. Load seen IDs (v2)
      const storedIds = JSON.parse(
        localStorage.getItem(SEEN_MEME_IDS_STORAGE_KEY) || '[]'
      );
      const validStoredIds = Array.isArray(storedIds)
        ? storedIds.filter((id): id is string => typeof id === 'string')
        : [];
      seenMemeIdsRef.current = new Set<string>(validStoredIds);
      seenMemeIdsListRef.current = [...validStoredIds];
    } catch {
      seenMemeUrlsRef.current = new Set<string>();
      seenMemeIdsRef.current = new Set<string>();
      seenMemeIdsListRef.current = [];
    }
    seenMemeUrlsInitRef.current = true;
  }

  const addToSeenMemes = useCallback((url: string, id?: string) => {
    if (!url) return;
    seenMemeUrlsRef.current.add(url);
    if (id && !seenMemeIdsRef.current.has(id)) {
      seenMemeIdsRef.current.add(id);
      seenMemeIdsListRef.current.push(id);
    }
  }, []);

  const persistSeenMemes = useCallback(() => {
    try {
      localStorage.setItem(SEEN_MEMES_STORAGE_KEY, JSON.stringify(Array.from(seenMemeUrlsRef.current)));
      localStorage.setItem(SEEN_MEME_IDS_STORAGE_KEY, JSON.stringify(Array.from(seenMemeIdsRef.current)));
    } catch {}
  }, []);

  // Helper to extract optimal 50-ID exclusion window for Cloudflare D1 query
  const getExcludeIdsForServer = useCallback((tempExcludedIds: string[] = []): string[] => {
    const allSeen = seenMemeIdsListRef.current;
    const combined = new Set<string>(tempExcludedIds);

    // Prioritize the latest seen memes so recent drops are strictly excluded in SQL
    for (let i = allSeen.length - 1; i >= 0 && combined.size < 50; i--) {
      combined.add(allSeen[i]);
    }
    return Array.from(combined).slice(0, 50);
  }, []);

  const persistActiveSession = useCallback((forExternalShare = false) => {
    const current = sessionStateRef.current;
    if (!current.meme || !current.meme.url) return;
    try {
      const dimsToSave: Record<string, { width: number; height: number }> = {};
      const urlsToTrack = new Set<string>([
        current.meme.url,
        ...current.memeQueue.map((m) => m.url),
        ...current.memeHistory.slice(-6).map((m) => m.url),
      ]);
      urlsToTrack.forEach((url) => {
        if (url) {
          const d = memeDimensionCache.get(url);
          if (d) dimsToSave[url] = d;
        }
      });

      const snapshot: ActiveSessionSnapshot = {
        meme: current.meme,
        screen: 'viewing',
        memeQueue: current.memeQueue.slice(0, PIPELINE_TARGET_SIZE),
        memeHistory: current.memeHistory.slice(-15),
        historyIndex: current.historyIndex,
        activeTab: current.activeTab,
        multiDropMemes: current.multiDropMemes,
        multiDropIndex: current.multiDropIndex,
        isMultiDropView: current.isMultiDropView,
        dimensions: dimsToSave,
        savedAt: Date.now(),
      };
      const serialized = JSON.stringify(snapshot);
      // Save to sessionStorage so switching between running apps preserves state, while closing background apps starts fresh on Homepage
      sessionStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, serialized);
      if (forExternalShare) {
        localStorage.setItem(SHARE_HANDOFF_STORAGE_KEY, serialized);
      }
    } catch (err) {
      console.warn('Could not persist active meme session:', err);
    }
  }, []);

  useEffect(() => {
    if (meme && meme.url) {
      addToSeenMemes(meme.url, meme.id);
      persistSeenMemes();
      persistActiveSession(false);
    }
  }, [
    meme,
    screen,
    memeQueue,
    memeHistory,
    historyIndex,
    activeTab,
    multiDropMemes,
    multiDropIndex,
    isMultiDropView,
    canvasDimensions,
    persistActiveSession,
    addToSeenMemes,
    persistSeenMemes,
  ]);

  useEffect(() => {
    const handleFlush = () => {
      persistActiveSession(false);
    };
    const handleResetToHome = () => {
      sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
      setShowMoreMenu(false);
      setActiveTab('home');
      setScreen('waiting');
      setMeme(null);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistActiveSession(false);
      } else if (document.visibilityState === 'visible') {
        // Ensure we stay in 'viewing' if a meme is already loaded in memory during app switching
        if (sessionStateRef.current.meme && sessionStateRef.current.screen !== 'viewing') {
          setScreen('viewing');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handleFlush);
    window.addEventListener('blur', handleFlush);
    window.addEventListener('meme-capsule-persist-session', handleFlush);
    window.addEventListener('meme-capsule-reset-to-home', handleResetToHome);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handleFlush);
      window.removeEventListener('blur', handleFlush);
      window.removeEventListener('meme-capsule-persist-session', handleFlush);
      window.removeEventListener('meme-capsule-reset-to-home', handleResetToHome);
    };
  }, [persistActiveSession]);

  // Warm browser image cache for hydrated session memes silently in the background
  useEffect(() => {
    if (!hydratedSession?.meme) return;
    const urls = [hydratedSession.meme.url, ...hydratedSession.memeQueue.map((m) => m.url)].filter(Boolean);
    urls.forEach((url) => {
      void preloadImage(url, 4000);
    });
  }, [hydratedSession]);

  const deckMemes = useMemo(() => {
    if (isMultiDropView && multiDropMemes.length > 0) {
      return multiDropMemes.slice(multiDropIndex);
    }
    return meme ? [meme, ...memeQueue] : memeQueue;
  }, [isMultiDropView, multiDropMemes, multiDropIndex, meme, memeQueue]);

  // Append a single validated meme directly into the live FIFO queue as soon as its preload finishes
  const enqueueMemeToFifo = useCallback((candidate: Meme | null) => {
    if (!candidate || !candidate.url) return;
    inFlightUrlsRef.current.delete(candidate.url);
    if (candidate.id) inFlightIdsRef.current.delete(candidate.id);
    setMemeQueue((prev) => {
      const existingUrls = new Set(prev.map((m) => m.url));
      const existingIds = new Set(prev.map((m) => m.id).filter(Boolean));
      if (sessionStateRef.current.meme?.url) {
        existingUrls.add(sessionStateRef.current.meme.url);
        if (sessionStateRef.current.meme.id) {
          existingIds.add(sessionStateRef.current.meme.id);
        }
      }
      const isAlreadySeen =
        existingUrls.has(candidate.url) ||
        (candidate.id ? existingIds.has(candidate.id) : false) ||
        seenMemeUrlsRef.current.has(candidate.url) ||
        (candidate.id ? seenMemeIdsRef.current.has(candidate.id) : false);

      if (isAlreadySeen) {
        return prev;
      }
      addToSeenMemes(candidate.url, candidate.id);
      persistSeenMemes();
      const updated = [...prev, candidate].slice(0, PIPELINE_TARGET_SIZE);
      memeQueueRef.current = updated;
      return updated;
    });
    setQueueFetchCounter((prev) => prev + 1);
  }, [addToSeenMemes, persistSeenMemes]);

  // Rolling FIFO Stack Refill Engine: streams new memes into memeQueue without blocking or dropping refill triggers
  const fillPipeline = useCallback(async (_currentQueueSize?: number, startOffset = 0) => {
    if (localStorage.getItem('pref_prefetch_buffer') === 'false') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    if (startOffset > fetchSeedCursorRef.current) {
      fetchSeedCursorRef.current = startOffset;
    }

    // If already filling when the 60-70% threshold is crossed, mark pendingRefillRef so the active runner continues seamlessly
    if (isFillingQueue.current) {
      pendingRefillRef.current = true;
      return;
    }

    isFillingQueue.current = true;
    try {
      do {
        pendingRefillRef.current = false;
        let safetyRounds = 0;
        const batchConcurrency = 3;

        while (memeQueueRef.current.length < PIPELINE_TARGET_SIZE && safetyRounds < 6) {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') break;
          safetyRounds += 1;
          const deficit = PIPELINE_TARGET_SIZE - memeQueueRef.current.length;
          const waveSize = Math.min(batchConcurrency, Math.max(2, deficit));
          const wavePromises: Promise<Meme | null>[] = [];

          for (let i = 0; i < waveSize; i++) {
            fetchSeedCursorRef.current += 1;
            const seed = fetchSeedCursorRef.current;
            wavePromises.push(
              fetchValidMeme(seed)
                .then((validMeme) => {
                  // Stream directly into FIFO queue the instant this meme finishes preloading
                  enqueueMemeToFifo(validMeme);
                  return validMeme;
                })
                .catch((err) => {
                  console.warn(`Pipeline wave fetch #${seed} failed:`, err);
                  return null;
                })
            );
          }

          await Promise.allSettled(wavePromises);
        }

        // Once the new stack is loaded into the FIFO buffer, reset the batch counter for the next 60%-70% trigger cycle
        if (memeQueueRef.current.length >= STACK_BATCH_SIZE) {
          stackBatchTotalRef.current = memeQueueRef.current.length + 1;
          stackBatchViewedRef.current = 0;
        }
      } while (
        pendingRefillRef.current &&
        memeQueueRef.current.length < PIPELINE_TARGET_SIZE &&
        (typeof document === 'undefined' || document.visibilityState !== 'hidden')
      );
    } finally {
      isFillingQueue.current = false;
    }
  }, [enqueueMemeToFifo]);

  // Track how much of the loaded stack the user has viewed and trigger next stack fetch at 60%-70% consumption
  const recordStackConsumptionAndMaybeRefill = useCallback(
    (remainingQueueLength: number, baseOffset: number) => {
      stackBatchViewedRef.current += 1;
      const totalInCurrentStack = Math.max(1, stackBatchTotalRef.current);
      const viewedFraction = stackBatchViewedRef.current / totalInCurrentStack;

      // Trigger next stack fetch as soon as 60%-70% of the loaded memes have been viewed (or buffer drops to <= 4 memes)
      if (
        viewedFraction >= STACK_PREFETCH_CONSUMPTION_RATIO ||
        remainingQueueLength <= FIFO_REFILL_TRIGGER_SIZE
      ) {
        stackBatchViewedRef.current = 0;
        stackBatchTotalRef.current = Math.max(STACK_BATCH_SIZE, remainingQueueLength + STACK_BATCH_SIZE);
        void fillPipeline(remainingQueueLength, baseOffset);
      }
    },
    [fillPipeline]
  );

  // Auto-fill pipeline whenever queue is below the 60%-70% consumption threshold and we're in viewing state
  useEffect(() => {
    const checkAndFill = () => {
      if (document.visibilityState === 'hidden') return;
      if (screen === 'viewing' && memeQueue.length <= FIFO_REFILL_TRIGGER_SIZE) {
        void fillPipeline(memeQueue.length, totalMemesViewed + queueFetchCounter);
      }
    };
    checkAndFill();
    document.addEventListener('visibilitychange', checkAndFill);
    return () => document.removeEventListener('visibilitychange', checkAndFill);
  }, [screen, memeQueue.length, fillPipeline, totalMemesViewed, queueFetchCounter]);

  const handleConfirmDob = useCallback((dob: string) => {
    localStorage.setItem('meme_capsule_user_dob', dob);
    localStorage.setItem('meme_capsule_dob_confirmed_at', new Date().toISOString());
    setUserDob(dob);
    setIsDobModalOpen(false);
    showToast('AGE VERIFIED (18+) ✓ WELCOME!', 'success');
  }, []);

  const handleAgreePolicy = useCallback((analyticsGranted: boolean = true, advertisingGranted: boolean = true) => {
    updateConsent(analyticsGranted, advertisingGranted, 1);
    localStorage.setItem('privacy_policy_agreed_version', '1.1');
    localStorage.setItem('privacy_policy_agreed_at', new Date().toISOString());
    setIsConsentModalOpen(false);
    const hasSeen = localStorage.getItem('has_seen_onboarding');
    if (!hasSeen) {
      setIsOnboardingOpen(true);
    } else {
      const savedDob = localStorage.getItem('meme_capsule_user_dob');
      if (!savedDob) {
        setIsDobModalOpen(true);
      }
    }
  }, [updateConsent]);

  // --- Google Play Rating Feature ---
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const redirectToPlayStore = useCallback(() => {
    if (typeof window.MemeCapsuleAndroid?.openPlayStoreListing === 'function') {
      window.MemeCapsuleAndroid.openPlayStoreListing();
      return;
    }
    window.open('https://play.google.com/store/apps/details?id=com.meme.capsule', '_blank', 'noopener,noreferrer');
  }, []);

  const handleRateApp = useCallback((_stars: number) => {
    localStorage.setItem('meme_capsule_rating_completed', 'true');
    setIsRatingModalOpen(false);
    redirectToPlayStore();
    setToastType('secondary');
    setToastText('THANKS FOR BACKING THE CHAOS! ⚡');
    setTimeout(() => setToastText(null), 3000);
  }, [redirectToPlayStore]);

  const handleDeferRating = useCallback(() => {
    const deferUntil = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem('meme_capsule_rating_deferred_until', String(deferUntil));
    localStorage.setItem('meme_capsule_rating_last_prompt_viewed', String(totalMemesViewed));
    setIsRatingModalOpen(false);
    setToastType('primary');
    setToastText('RATING SNOOZED FOR 24 HOURS ⏰');
    setTimeout(() => setToastText(null), 2500);
  }, [totalMemesViewed]);

  const checkRatingPromptEligibility = useCallback((viewedCount: number) => {
    // 1. If user already registered feedback, never prompt again automatically
    if (localStorage.getItem('meme_capsule_rating_completed') === 'true') {
      return false;
    }
    // 2. If deferred, check if 24 hours have elapsed
    const deferredUntil = Number(localStorage.getItem('meme_capsule_rating_deferred_until') || 0);
    if (Date.now() < deferredUntil) {
      return false;
    }
    // 3. Check meme viewed interval (first prompt at >= 8 memes, then every 15 memes)
    const lastPromptViewed = Number(localStorage.getItem('meme_capsule_rating_last_prompt_viewed') || 0);
    const shouldPrompt = (lastPromptViewed === 0 && viewedCount >= 8) ||
                         (lastPromptViewed > 0 && viewedCount - lastPromptViewed >= 15);
    return shouldPrompt;
  }, []);

  useEffect(() => {
    if (screen !== 'loaded' || activeTab !== 'home') return;
    if (!checkRatingPromptEligibility(totalMemesViewed)) return;

    const timer = setTimeout(() => {
      if (
        !isDobModalOpen &&
        !isConsentModalOpen &&
        !isPolicyModalOpen &&
        !isOnboardingOpen &&
        !isStoreOpen &&
        !shareTargetMeme &&
        !isReportModalOpen &&
        !isRedditInfoOpen &&
        !unpinTargetMeme &&
        !isBoardComposerOpen &&
        !rewardBusyRef.current
      ) {
        setIsRatingModalOpen(true);
        localStorage.setItem('meme_capsule_rating_last_prompt_viewed', String(totalMemesViewed));
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    totalMemesViewed,
    screen,
    activeTab,
    isDobModalOpen,
    isConsentModalOpen,
    isPolicyModalOpen,
    isOnboardingOpen,
    isStoreOpen,
    shareTargetMeme,
    isReportModalOpen,
    isRedditInfoOpen,
    unpinTargetMeme,
    isBoardComposerOpen,
    checkRatingPromptEligibility,
  ]);

  useEffect(() => {
    const policyVersion = localStorage.getItem('privacy_policy_agreed_version');
    if (policyVersion !== '1.1') {
      setIsConsentModalOpen(true);
    } else {
      const hasSeen = localStorage.getItem('has_seen_onboarding');
      if (!hasSeen) {
        setIsOnboardingOpen(true);
      } else {
        const savedDob = localStorage.getItem('meme_capsule_user_dob');
        if (!savedDob) {
          setIsDobModalOpen(true);
        }
      }
    }

    // Streak tracking
    const today = new Date().toISOString().split('T')[0];
    const lastDate = localStorage.getItem('streak_last_date');
    const savedStreak = parseInt(localStorage.getItem('streak_count') || '0', 10);

    if (lastDate === today) {
      setStreak(savedStreak || 1);
      trackRetentionCheckin(savedStreak || 1);
    } else if (lastDate) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (lastDate === yesterday) {
        const newStreak = savedStreak + 1;
        setStreak(newStreak);
        localStorage.setItem('streak_count', newStreak.toString());
        localStorage.setItem('streak_last_date', today);
        trackRetentionCheckin(newStreak);
      } else {
        setStreak(1);
        localStorage.setItem('streak_count', '1');
        localStorage.setItem('streak_last_date', today);
        trackRetentionCheckin(1);
      }
    } else {
      setStreak(1);
      localStorage.setItem('streak_count', '1');
      localStorage.setItem('streak_last_date', today);
      trackRetentionCheckin(1);
    }

    let loadedFavs: Meme[] = [];
    const savedFavs = localStorage.getItem('meme_favorites');
    if (savedFavs) {
      try {
        loadedFavs = JSON.parse(savedFavs);
        setFavorites(loadedFavs);
      } catch (e) {
        console.error(e);
      }
    }

    let loadedPins: Meme[] = [];
    const savedPinboard = localStorage.getItem('meme_pinboard');
    if (savedPinboard) {
      try {
        loadedPins = JSON.parse(savedPinboard);
        setPinnedMemes(loadedPins);
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

        // RECOVERY & SYNCHRONIZATION:
        // Ensure every meme URL across all mood boards has a corresponding Meme object in pinnedMemes
        const allBoardUrls = Array.from(new Set(boards.flatMap((b) => b.memeUrls)));
        let pinboardUpdated = false;
        const currentPins = [...loadedPins];

        for (const url of allBoardUrls) {
          if (!currentPins.some((p) => p.url === url)) {
            const fromFav = loadedFavs.find((f) => f.url === url);
            const recoveredMeme: Meme = fromFav
              ? { ...fromFav, savedAt: fromFav.savedAt || Date.now() }
              : {
                  url,
                  title: 'PINNED MEME',
                  author: 'MemeCapsule',
                  source: 'Meme Capsule',
                  savedAt: Date.now(),
                };
            currentPins.unshift(recoveredMeme);
            pinboardUpdated = true;
          }
        }

        if (pinboardUpdated) {
          setPinnedMemes(currentPins);
          localStorage.setItem('meme_pinboard', JSON.stringify(currentPins));
        }
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

    return () => clearInterval(jokeTimer);
  }, []);

  useEffect(() => {
    try {
      const pinned = JSON.parse(
        localStorage.getItem('meme_pinboard') ?? '[]'
      ) as Meme[];
      if (Array.isArray(pinned) && pinned.length > 0) {
        setPinnedMemes(pinned);
      } else {
        const savedBoards = localStorage.getItem('meme_mood_boards');
        if (savedBoards) {
          const boards = JSON.parse(savedBoards) as MoodBoard[];
          const allUrls = Array.from(new Set(boards.flatMap((b) => b.memeUrls)));
          if (allUrls.length > 0) {
            const savedFavs = JSON.parse(localStorage.getItem('meme_favorites') ?? '[]') as Meme[];
            const recovered: Meme[] = allUrls.map((url) => {
              const f = savedFavs.find((item) => item.url === url);
              return f || {
                url,
                title: 'PINNED MEME',
                author: 'MemeCapsule',
                source: 'Meme Capsule',
                savedAt: Date.now(),
              };
            });
            setPinnedMemes(recovered);
            localStorage.setItem('meme_pinboard', JSON.stringify(recovered));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [activeTab]);

  const screenTransitionTabRef = useRef<TabType>(activeTab);
  useEffect(() => {
    trackScreenView(activeTab);
    if (screenTransitionTabRef.current !== activeTab) {
      const fromTab = screenTransitionTabRef.current;
      screenTransitionTabRef.current = activeTab;
      void maybeShowScreenTransitionInterstitial(fromTab, activeTab);
    }
  }, [activeTab, trackScreenView]);

  const watchForReward = async (grant: () => void, message: string) => {
    if (rewardBusyRef.current) return;
    rewardBusyRef.current = true;
    setRewardBusy(true);
    showToast('LOADING REWARDED AD...', 'primary');
    try {
      // Paid ad-free ownership includes the optional reward perks without video.
      if (await hasRemovedAds()) {
        grant();
        showToast(message, 'success');
        return;
      }
      trackAdImpression('rewarded');
      const result = await showRewardedAd();
      if (result.rewarded === true) {
        trackAdRewardViewed('bonus_drop');
        grant();
        showToast(message, 'success');
      } else {
        // In sideloaded APK / development without live AdMob fill, grant test reward so testing free features is never blocked
        trackAdRewardViewed('bonus_drop_test');
        grant();
        showToast('TEST REWARD GRANTED (+1 SLOT) ✓', 'success');
      }
    } catch {
      grant();
      showToast('TEST REWARD GRANTED (+1 SLOT) ✓', 'success');
    } finally {
      rewardBusyRef.current = false;
      setRewardBusy(false);
    }
  };

  const watchForBoard = () => watchForReward(() => {
    grantBonusBoard();
    setBoardLimitReached(false);
  }, '+1 BOARD SLOT THIS SESSION ✓');

  const showRewardedAdAndGetBonus = async () => {
    // Pro users get instant bonus drops without ads
    if (isPro) {
      showToast('💎 PRO INSTANT DROP!', 'success');
      void fetchMeme();
      return;
    }

    await watchForReward(() => { void fetchMeme(); }, 'REWARD UNLOCKED! FRESH DROP INCOMING!');
  };

const preloadImage = (url: string, timeoutMs = 3500): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        memeDimensionCache.set(url, { width: img.naturalWidth, height: img.naturalHeight });
      }
      resolve(img.naturalWidth > 0 && img.naturalHeight > 0);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };

    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      // On slower mobile connections, if URL is well-formed, allow it through
      // so the card displays immediately rather than choking on retry loops
      resolve(isValidImageUrl(url));
    }, timeoutMs);

    img.src = url;
    if (img.complete && img.naturalWidth > 0) {
      settled = true;
      cleanup();
      resolve(true);
    }
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

const CURATED_FALLBACK_MEMES: Meme[] = [
  {
    id: 'vault-drop-1',
    url: 'https://pub-3e7961a132964ff581b779a5dad40771.r2.dev/C3VwSYoOSW__2.jpg',
    title: 'CURATED VAULT DROP',
    author: 'Meme Capsule Vault',
    subreddit: 'D1 Vault',
    rarity: 'Common',
    mediaType: 'image',
    source: 'Meme Capsule',
    likes: 42,
  },
  {
    id: 'vault-drop-2',
    url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201080%201080%22%3E%3Crect%20width%3D%221080%22%20height%3D%221080%22%20fill%3D%22%23fff8e7%22%2F%3E%3Crect%20x%3D%22126%22%20y%3D%22180%22%20width%3D%22828%22%20height%3D%22720%22%20rx%3D%2248%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%22186%22%20y%3D%22238%22%20width%3D%22708%22%20height%3D%2218%22%20rx%3D%229%22%20fill%3D%22%23ffcc4d%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22390%22%20text-anchor%3D%22middle%22%20font-size%3D%2280%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2316120f%22%3EI%20OPENED%20THE%20APP%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22524%22%20text-anchor%3D%22middle%22%20font-size%3D%22108%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2316120f%22%3EFOR%20ONE%20MEME%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22654%22%20text-anchor%3D%22middle%22%20font-size%3D%2248%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22800%22%20fill%3D%22%2316120f%22%20opacity%3D%220.82%22%3ETHREE%20SHARES%20LATER%3C%2Ftext%3E%3Crect%20x%3D%22372%22%20y%3D%22738%22%20width%3D%22336%22%20height%3D%2284%22%20rx%3D%2242%22%20fill%3D%22%23ffcc4d%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22795%22%20text-anchor%3D%22middle%22%20font-size%3D%2234%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2316120f%22%3ECURATED%20CHAOS%3C%2Ftext%3E%3C%2Fsvg%3E',
    title: 'THE LOOP',
    author: 'Meme Capsule Vault',
    subreddit: 'Quick Laughs',
    rarity: 'Common',
    mediaType: 'image',
    source: 'Meme Capsule',
    likes: 64,
  },
  {
    id: 'vault-drop-3',
    url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201080%201080%22%3E%3Crect%20width%3D%221080%22%20height%3D%221080%22%20fill%3D%22%23e9f7ff%22%2F%3E%3Crect%20x%3D%22126%22%20y%3D%22180%22%20width%3D%22828%22%20height%3D%22720%22%20rx%3D%2248%22%20fill%3D%22%23f8fdff%22%2F%3E%3Crect%20x%3D%22186%22%20y%3D%22238%22%20width%3D%22708%22%20height%3D%2218%22%20rx%3D%229%22%20fill%3D%22%2342b8dd%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22390%22%20text-anchor%3D%22middle%22%20font-size%3D%2280%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2310202b%22%3EBRAIN%20AT%202%20AM%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22524%22%20text-anchor%3D%22middle%22%20font-size%3D%22108%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2310202b%22%3ENEW%20APP%20IDEA%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22654%22%20text-anchor%3D%22middle%22%20font-size%3D%2248%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22800%22%20fill%3D%22%2310202b%22%20opacity%3D%220.82%22%3ENO%20BUDGET%2C%20FULL%20CONFIDENCE%3C%2Ftext%3E%3Crect%20x%3D%22372%22%20y%3D%22738%22%20width%3D%22336%22%20height%3D%2284%22%20rx%3D%2242%22%20fill%3D%22%2342b8dd%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22795%22%20text-anchor%3D%22middle%22%20font-size%3D%2234%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%2310202b%22%3EBUILDER%20MOOD%3C%2Ftext%3E%3C%2Fsvg%3E',
    title: 'BUILDER CONFIDENCE',
    author: 'Meme Capsule Vault',
    subreddit: 'Builder Mood',
    rarity: 'Rare',
    mediaType: 'image',
    source: 'Meme Capsule',
    likes: 91,
  },
  {
    id: 'vault-drop-4',
    url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201080%201080%22%3E%3Crect%20width%3D%221080%22%20height%3D%221080%22%20fill%3D%22%23f7f7f7%22%2F%3E%3Crect%20x%3D%22126%22%20y%3D%22180%22%20width%3D%22828%22%20height%3D%22720%22%20rx%3D%2248%22%20fill%3D%22%23ffffff%22%2F%3E%3Crect%20x%3D%22186%22%20y%3D%22238%22%20width%3D%22708%22%20height%3D%2218%22%20rx%3D%229%22%20fill%3D%22%23ff5f5f%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22390%22%20text-anchor%3D%22middle%22%20font-size%3D%2280%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%23151515%22%3ENO%20COMMENTS%20SECTION%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22524%22%20text-anchor%3D%22middle%22%20font-size%3D%22108%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%23151515%22%3ENO%20DRAMA%3C%2Ftext%3E%3Ctext%20x%3D%22540%22%20y%3D%22654%22%20text-anchor%3D%22middle%22%20font-size%3D%2248%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22800%22%20fill%3D%22%23151515%22%20opacity%3D%220.82%22%3EJUST%20THE%20MEME%3C%2Ftext%3E%3Crect%20x%3D%22372%22%20y%3D%22738%22%20width%3D%22336%22%20height%3D%2284%22%20rx%3D%2242%22%20fill%3D%22%23ff5f5f%22%2F%3E%3Ctext%20x%3D%22540%22%20y%3D%22795%22%20text-anchor%3D%22middle%22%20font-size%3D%2234%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22900%22%20fill%3D%22%23151515%22%3EMINIMALISM%3C%2Ftext%3E%3C%2Fsvg%3E',
    title: 'JUST THE MEME',
    author: 'Meme Capsule Vault',
    subreddit: 'Minimalism',
    rarity: 'Legendary',
    mediaType: 'image',
    source: 'Meme Capsule',
    likes: 105,
  },
];

const getCuratedFallbackMeme = (seed: number): Meme => {
  const index = Math.abs(seed) % CURATED_FALLBACK_MEMES.length;
  const chosen = CURATED_FALLBACK_MEMES[index];
  return {
    ...chosen,
    id: `${chosen.id}-${seed}`,
  };
};

const fetchMixedMeme = async (nextViewed: number, excludeIds?: string[]): Promise<Meme> => {
  const allowReddit = localStorage.getItem('pref_reddit_stream') !== 'false';
  const shouldFetchReddit = allowReddit && nextViewed % 3 === 0;

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
    const json = await fetchBackendMemePayload(excludeIds);
    if (!json?.meme) throw new Error('Unexpected Meme Capsule payload');
    const memeData: BackendMemePayload = json.meme;

    // Strict validation: Must be active (is_active = 1 or true), status != archived, category != archived
    if (memeData.is_active === 0 || memeData.is_active === false) {
      throw new Error('Backend meme is not active');
    }
    if (memeData.status && memeData.status.toLowerCase() === 'archived') {
      throw new Error('Backend meme status is archived');
    }
    if (memeData.category && memeData.category.toLowerCase() === 'archived') {
      throw new Error('Backend meme category is archived');
    }

    const backendMeme = normalizeMeme(memeData);
    if (!backendMeme.url || !isValidImageUrl(backendMeme.url)) {
      throw new Error('Backend meme did not include a valid image URL');
    }
    return backendMeme;
  } catch (backendError) {
    if (allowReddit) {
      console.warn('Backend meme fetch failed, trying Reddit fallback', backendError);
      try {
        const reddit = await fetchRedditMemePayload();
        const redditMeme = normalizeRedditMeme(reddit);
        if (redditMeme.url && !reddit.nsfw && !reddit.spoiler && isValidImageUrl(redditMeme.url)) {
          return redditMeme;
        }
      } catch {}
    }
    throw backendError;
  }
};

const fetchValidMeme = async (nextViewed: number, maxRetries = 35): Promise<Meme> => {
  let reportedList: string[] = [];
  try {
    reportedList = JSON.parse(localStorage.getItem('reported_memes') || '[]');
  } catch (e) {}

  let candidateFallback: Meme | null = null;
  const retryExcludedIds: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Build dynamic exclusion query: combines recent seen IDs + duplicate candidates encountered during this retry sequence
      const excludeList = getExcludeIdsForServer(retryExcludedIds);
      const candidate = await fetchMixedMeme(nextViewed + attempt, excludeList);
      if (!candidate?.url) continue;

      // 1. Skip reported / blocked memes
      if (reportedList.includes(candidate.url) || (candidate.id && reportedList.includes(candidate.id))) {
        if (candidate.id && !retryExcludedIds.includes(candidate.id)) {
          retryExcludedIds.push(candidate.id);
        }
        continue;
      }

      // 2. Skip memes currently in-flight by parallel fetch workers
      if (inFlightUrlsRef.current.has(candidate.url) || (candidate.id && inFlightIdsRef.current.has(candidate.id))) {
        continue;
      }

      // 3. Skip currently displayed meme or memes already in FIFO queue
      const isCurrentlyDisplayed =
        sessionStateRef.current.meme?.url === candidate.url ||
        (candidate.id ? sessionStateRef.current.meme?.id === candidate.id : false);
      const isAlreadyInQueue = memeQueueRef.current.some(
        (m) => m.url === candidate.url || (candidate.id ? m.id === candidate.id : false)
      );
      if (isCurrentlyDisplayed || isAlreadyInQueue) {
        if (candidate.id && !retryExcludedIds.includes(candidate.id)) {
          retryExcludedIds.push(candidate.id);
        }
        continue;
      }

      // 4. Skip persistent seen memes from this or past sessions (by URL or ID)
      const isAlreadySeen =
        seenMemeUrlsRef.current.has(candidate.url) ||
        (candidate.id ? seenMemeIdsRef.current.has(candidate.id) : false);

      if (isAlreadySeen) {
        if (candidate.id && !retryExcludedIds.includes(candidate.id)) {
          retryExcludedIds.push(candidate.id);
        }
        if (!candidateFallback) {
          candidateFallback = candidate;
        }
        continue;
      }

      // Unseen candidate passed deduplication filters! Lock in-flight during preload
      inFlightUrlsRef.current.add(candidate.url);
      if (candidate.id) inFlightIdsRef.current.add(candidate.id);

      const isLoaded = await preloadImage(candidate.url, 3500);
      if (isLoaded) {
        return candidate;
      }

      // Preload failed/timed out, release from in-flight
      inFlightUrlsRef.current.delete(candidate.url);
      if (candidate.id) inFlightIdsRef.current.delete(candidate.id);
      console.warn(`[Attempt ${attempt + 1}/${maxRetries}] Preload failed for ${candidate.url}. Retrying next...`);
    } catch (err) {
      console.warn(`[Attempt ${attempt + 1}/${maxRetries}] Fetch candidate failed:`, err);
    }
  }

  // If after maxRetries all fetched memes were in the seen set,
  // the user has consumed 100% of the active curated catalog (~750-800 memes).
  // Per specification: The user is never stopped, and the capsule is never depleted.
  // Seamlessly begin a fresh cycle so browsing remains continuous and infinite.
  if (candidateFallback) {
    console.log('[Meme Capsule Engine] Catalog 100% consumed. Starting fresh cycle.');
    seenMemeUrlsRef.current.clear();
    seenMemeIdsRef.current.clear();
    seenMemeIdsListRef.current = [];
    persistSeenMemes();
    inFlightUrlsRef.current.delete(candidateFallback.url);
    if (candidateFallback.id) inFlightIdsRef.current.delete(candidateFallback.id);
    return candidateFallback;
  }

  // Graceful fallback to verified curated vault meme
  return getCuratedFallbackMeme(nextViewed);
};

  const showToast = (text: string, type: 'primary' | 'secondary' | 'tertiary' | 'success' = 'primary') => {
    setToastText(text);
    setToastType(type);
    setTimeout(() => setToastText(null), 2500);
  };

  useEffect(() => {
    startRewardSession();
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      refreshPerks(value => value + 1);
      clearTimeout(expiryTimer);
      const remaining = getAdFreeExpiry() - Date.now();
      if (remaining > 0) expiryTimer = setTimeout(refresh, Math.min(remaining + 1, 2147483647));
    };
    refresh();
    const toast = (event: Event) => showToast((event as CustomEvent<string>).detail, 'success');
    window.addEventListener(MONETIZATION_CHANGED, refresh);
    window.addEventListener(MONETIZATION_TOAST, toast);
    window.addEventListener('meme-capsule-reset-to-home', resetBonusBoards);
    return () => {
      clearTimeout(expiryTimer);
      window.removeEventListener(MONETIZATION_CHANGED, refresh);
      window.removeEventListener(MONETIZATION_TOAST, toast);
      window.removeEventListener('meme-capsule-reset-to-home', resetBonusBoards);
    };
  }, []);

  useEffect(() => {
    const themeChanged = () => setSelectedTheme(localStorage.getItem(THEME_KEY) || 'classic');
    const reconcile = () => {
      if (document.visibilityState === 'visible') void getEntitlements(true).catch(() => undefined);
    };
    const checkTtl = () => {
      if (document.visibilityState === 'visible') void getEntitlements().catch(() => undefined);
    };
    reconcile();
    const timer = window.setInterval(checkTtl, 60_000);
    document.addEventListener('visibilitychange', reconcile);
    window.addEventListener('focus', reconcile);
    window.addEventListener(THEME_CHANGED, themeChanged);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', reconcile);
      window.removeEventListener('focus', reconcile);
      window.removeEventListener(THEME_CHANGED, themeChanged);
    };
  }, []);

  const showHomeBanner = Boolean(AD_UNITS.banner) && activeTab === 'home' && screen === 'waiting' &&
    !isDobModalOpen && !isStoreOpen && !isConsentModalOpen && !isOnboardingOpen && !shareTargetMeme && !rewardBusy &&
    !entitlements.adsRemoved && !isInAdFreeWindow();
  useEffect(() => {
    void setBannerVisible(showHomeBanner).catch(() => undefined);
    return () => { void setBannerVisible(false).catch(() => undefined); };
  }, [showHomeBanner]);

  const showReaction = (text: string) => {
    setMemeFeedback(text);
    if (shakeEffectsEnabled) {
      setShakeCard(true);
    }
    setTimeout(() => {
      setMemeFeedback(null);
      setShakeCard(false);
    }, 1000);
  };

  // --- Settings & History Management Handlers ---
  const toggleRedditStream = () => {
    const next = !redditStreamEnabled;
    setRedditStreamEnabled(next);
    localStorage.setItem('pref_reddit_stream', String(next));
    showToast(next ? 'AUXILIARY REDDIT STREAM: ENABLED' : 'CURATED D1 VAULT ONLY: ENABLED', 'secondary');
  };

  const toggleShakeEffects = () => {
    const next = !shakeEffectsEnabled;
    setShakeEffectsEnabled(next);
    localStorage.setItem('pref_shake_effects', String(next));
    showToast(next ? 'CARD SHAKE EFFECTS: ON' : 'CARD SHAKE EFFECTS: OFF', 'secondary');
  };

  const togglePrefetchBuffer = () => {
    const next = !prefetchEnabled;
    setPrefetchEnabled(next);
    localStorage.setItem('pref_prefetch_buffer', String(next));
    if (!next) {
      setMemeQueue([]);
    }
    showToast(next ? '7-MEME TURBO BUFFER: ENABLED' : 'DATA SAVER MODE: BUFFER PAUSED', 'secondary');
  };

  const handleClearViewHistory = () => {
    setTotalMemesViewed(0);
    setTotalMemesFetched(0);
    setLikedMemes([]);
    setMemeReactions({});
    setMemeHistory([]);
    setHistoryIndex(-1);
    setMemeQueue([]);
    seenMemeUrlsRef.current.clear();
    seenMemeIdsRef.current.clear();
    seenMemeIdsListRef.current = [];
    inFlightUrlsRef.current.clear();
    inFlightIdsRef.current.clear();
    localStorage.removeItem('total_memes_viewed');
    localStorage.removeItem('total_memes_fetched');
    localStorage.removeItem('liked_memes');
    localStorage.removeItem('meme_reactions');
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
    localStorage.removeItem(SEEN_MEMES_STORAGE_KEY);
    localStorage.removeItem(SEEN_MEME_IDS_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SEEN_MEMES_STORAGE_KEY);
    sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    memeDimensionCache.clear();
    setConfirmWipeMode('none');
    showToast('PAST VIEWING HISTORY & STATS CLEARED!', 'success');
  };

  const handleClearVaultAndBoards = () => {
    setFavorites([]);
    setMoodBoards([]);
    setPinnedMemes([]);
    setSelectedBoardId(null);
    localStorage.removeItem('meme_favorites');
    localStorage.removeItem('meme_mood_boards');
    localStorage.removeItem('meme_pinboard');
    setConfirmWipeMode('none');
    showToast('VAULT & MOOD BOARDS WIPED CLEAN!', 'tertiary');
  };

  const handleClearBlockedMemes = () => {
    localStorage.removeItem('reported_memes');
    setBlockedMemesCount(0);
    showToast('BLOCKED MEMES LIST RESET!', 'secondary');
  };

  const handleWipeAllAppData = () => {
    // 1. Clear viewing history & reactions
    setTotalMemesViewed(0);
    setTotalMemesFetched(0);
    setLikedMemes([]);
    setMemeReactions({});
    setMemeHistory([]);
    setHistoryIndex(-1);
    setMemeQueue([]);
    setMultiDropMemes([]);
    setIsMultiDropView(false);
    setMeme(null);
    setScreen('waiting');

    // 2. Clear Vault, Mood Boards, and Pinboard
    setFavorites([]);
    setMoodBoards([]);
    setPinnedMemes([]);
    setSelectedBoardId(null);

    // 3. Clear Blocked Memes & Reset Streak
    setBlockedMemesCount(0);
    setStreak(1);
    seenMemeUrlsRef.current.clear();
    seenMemeIdsRef.current.clear();
    seenMemeIdsListRef.current = [];
    inFlightUrlsRef.current.clear();
    inFlightIdsRef.current.clear();

    // 4. Remove from localStorage (preserve privacy policy consent & pro purchase status)
    const keysToRemove = [
      'total_memes_viewed',
      'total_memes_fetched',
      'liked_memes',
      'meme_reactions',
      'meme_favorites',
      'meme_mood_boards',
      'meme_pinboard',
      'reported_memes',
      'streak_count',
      'streak_last_date',
      ACTIVE_SESSION_STORAGE_KEY,
      SHARE_HANDOFF_STORAGE_KEY,
      SEEN_MEMES_STORAGE_KEY,
      SEEN_MEME_IDS_STORAGE_KEY,
      LEGACY_SEEN_MEMES_STORAGE_KEY,
    ];
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    memeDimensionCache.clear();
    setConfirmWipeMode('none');
    showToast('ALL APP HISTORY & DATA DELETED!', 'tertiary');
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
      if (shakeEffectsEnabled) {
        setShakeCard(true);
      }
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

  // Seamless in-place card advance if user speed-swipes faster than network without ever breaking flow with the loading screen
  const advanceInlineWithoutLoadingScreen = useCallback(async () => {
    const nextViewed = totalMemesViewed + 1;
    void fillPipeline(memeQueueRef.current.length, nextViewed + queueFetchCounter);
    try {
      const nextMeme = await fetchValidMeme(nextViewed + 1);
      inFlightUrlsRef.current.delete(nextMeme.url);
      if (nextMeme.id) inFlightIdsRef.current.delete(nextMeme.id);
      addToSeenMemes(nextMeme.url, nextMeme.id);
      persistSeenMemes();
      setImageFailed(false);
      setMeme(nextMeme);
      setScreen('viewing');
      setTotalMemesViewed(nextViewed);
      setTotalMemesFetched(Math.max(totalMemesFetched, nextViewed));
      localStorage.setItem('total_memes_viewed', nextViewed.toString());
      localStorage.setItem('total_memes_fetched', Math.max(totalMemesFetched, nextViewed).toString());
      setMemeHistory((prev) => [...prev.slice(-14), nextMeme]);
      setHistoryIndex(-1);
      if (nextMeme.id) trackEvent(nextMeme.id, 'view');
    } catch (err) {
      console.warn('Inline meme advance fallback error:', err);
    }
  }, [totalMemesViewed, totalMemesFetched, queueFetchCounter, fillPipeline, trackEvent, addToSeenMemes, persistSeenMemes]);

  const swipeToNext = useCallback(() => {
    setShowReactionPicker(false);
    setShowBoardPicker(false);

    const activeQueue = memeQueueRef.current.length > 0 ? memeQueueRef.current : memeQueue;
    if (activeQueue.length > 0) {
      // INSTANT: Pop from pipeline queue front
      const [nextMeme, ...remainingQueue] = activeQueue;
      memeQueueRef.current = remainingQueue;
      setExitDirection('up');
      setIsTransitioning(true);

      const nextViewed = totalMemesViewed + 1;
      // Trigger next stack fetch immediately if 60%-70% of loaded stack has been viewed
      recordStackConsumptionAndMaybeRefill(remainingQueue.length, nextViewed + queueFetchCounter);

      // Phase 1: Exit animation (300ms)
      setTimeout(() => {
        setExitDirection(null);
        setSwipeDirection('up');
        setImageFailed(false);
        setMeme(nextMeme);
        setMemeQueue(remainingQueue);
        addToSeenMemes(nextMeme.url, nextMeme.id);
        persistSeenMemes();

        setTotalMemesViewed(nextViewed);
        setTotalMemesFetched(Math.max(totalMemesFetched, nextViewed));
        localStorage.setItem('total_memes_viewed', nextViewed.toString());
        localStorage.setItem('total_memes_fetched', Math.max(totalMemesFetched, nextViewed).toString());
        setMemeHistory(prev => [...prev.slice(-14), nextMeme]);
        setHistoryIndex(-1);

        if (nextMeme.id) trackEvent(nextMeme.id, 'view');

        // Phase 2: Enter animation done (400ms)
        setTimeout(() => {
          setSwipeDirection(null);
          setIsTransitioning(false);
        }, 400);
      }, 280);
    } else {
      // Keep user in viewing screen without full-screen loader interruption
      setIsTransitioning(true);
      advanceInlineWithoutLoadingScreen().finally(() => {
        setSwipeDirection(null);
        setIsTransitioning(false);
      });
    }
  }, [
    memeQueue,
    totalMemesViewed,
    totalMemesFetched,
    queueFetchCounter,
    recordStackConsumptionAndMaybeRefill,
    advanceInlineWithoutLoadingScreen,
    trackEvent,
    addToSeenMemes,
    persistSeenMemes,
  ]);

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
      setBlockedMemesCount(currentBlocked.length);

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
      trackMemeReported(meme.id || meme.url, reason);
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
    if (!localStorage.getItem('meme_capsule_user_dob')) {
      setIsDobModalOpen(true);
      return;
    }

    setShowReactionPicker(false);
    setShowBoardPicker(false);
    setErrorMsg('');
    trackFeedRefresh();

    // If we already have pre-fetched memes in the FIFO buffer queue, pop immediately without reloading
    const currentQueue = memeQueueRef.current.length > 0 ? memeQueueRef.current : memeQueue;
    if (currentQueue.length > 0) {
      const [nextMeme, ...remainingQueue] = currentQueue;
      memeQueueRef.current = remainingQueue;
      setImageFailed(false);
      setMeme(nextMeme);
      setMemeQueue(remainingQueue);
      addToSeenMemes(nextMeme.url, nextMeme.id);
      persistSeenMemes();
      setScreen('viewing');

      const nextViewed = totalMemesViewed + 1;
      setTotalMemesViewed(nextViewed);
      setTotalMemesFetched(Math.max(totalMemesFetched, nextViewed));
      localStorage.setItem('total_memes_viewed', nextViewed.toString());
      localStorage.setItem('total_memes_fetched', Math.max(totalMemesFetched, nextViewed).toString());

      setMemeHistory((prev) => [...prev.slice(-14), nextMeme]);
      setHistoryIndex(-1);

      if (nextMeme.id) {
        trackEvent(nextMeme.id, 'view');
      }

      recordStackConsumptionAndMaybeRefill(remainingQueue.length, nextViewed + queueFetchCounter);
      return;
    }

    // If the user is already in 'viewing' mode (e.g. bonus drop or speed-swipe), advance inline without showing full-screen loading terminal
    if (screen === 'viewing' && meme) {
      await advanceInlineWithoutLoadingScreen();
      return;
    }

    setScreen('loading');
    setLoadProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + Math.floor(Math.random() * 25) + 15, 100);
      setLoadProgress(progress);
      const logIdx = Math.floor((progress / 100) * HACKER_LOGS.length);
      setCurrentLog(HACKER_LOGS[Math.min(logIdx, HACKER_LOGS.length - 1)]);
      if (progress >= 100) clearInterval(interval);
    }, 80);

    try {
      const nextViewed = totalMemesViewed + 1;
      // Fetch Card 1 fast so user transitions instantly to viewing
      const finalMeme = await fetchValidMeme(nextViewed);

      clearInterval(interval);
      setLoadProgress(100);

      setTimeout(() => {
        inFlightUrlsRef.current.delete(finalMeme.url);
        if (finalMeme.id) inFlightIdsRef.current.delete(finalMeme.id);
        addToSeenMemes(finalMeme.url, finalMeme.id);
        persistSeenMemes();
        setImageFailed(false);
        setMeme(finalMeme);
        setScreen('viewing');
        setTotalMemesViewed(nextViewed);
        setTotalMemesFetched(nextViewed);
        localStorage.setItem('total_memes_viewed', nextViewed.toString());
        localStorage.setItem('total_memes_fetched', nextViewed.toString());

        // Reset stack consumption tracker for the newly initialized stack
        stackBatchTotalRef.current = STACK_BATCH_SIZE;
        stackBatchViewedRef.current = 1;
        fetchSeedCursorRef.current = Math.max(fetchSeedCursorRef.current, nextViewed + 3);

        // Add to history
        setMemeHistory(prev => [...prev.slice(-14), finalMeme]);
        setHistoryIndex(-1);

        // Track the view event
        if (finalMeme.id) {
          trackEvent(finalMeme.id, 'view');
        }

        // In background, stream the initial 4-card stack and fill the full 12-meme rolling FIFO buffer
        (async () => {
          const restResults = await Promise.all([
            fetchValidMeme(nextViewed + 1)
              .then((m) => {
                enqueueMemeToFifo(m);
                return m;
              })
              .catch(() => null),
            fetchValidMeme(nextViewed + 2)
              .then((m) => {
                enqueueMemeToFifo(m);
                return m;
              })
              .catch(() => null),
            fetchValidMeme(nextViewed + 3)
              .then((m) => {
                enqueueMemeToFifo(m);
                return m;
              })
              .catch(() => null),
          ]);
          const initialCount = restResults.filter((m): m is Meme => m !== null).length;
          if (initialCount > 0) {
            setTotalMemesFetched(nextViewed + initialCount);
            localStorage.setItem('total_memes_fetched', (nextViewed + initialCount).toString());
          }
          void fillPipeline(memeQueueRef.current.length, nextViewed + initialCount);
        })();
      }, 150);
    } catch (error) {
      clearInterval(interval);
      console.error('Fetch meme error:', error);
      setErrorMsg('COMEDY DECRYPTION TIMEOUT');
      setScreen('error');
    }
  };

  // Firebase Cloud Messaging Push Notifications Initialization & Handling
  const fetchMemeRef = useRef(fetchMeme);
  fetchMemeRef.current = fetchMeme;
  const openStoreRef = useRef(openStore);
  openStoreRef.current = openStore;
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    initPushNotifications(
      (data) => {
        if (data?.screen === 'favorites') {
          setActiveTab('favorites');
        } else if (data?.screen === 'boards') {
          setActiveTab('boards');
        } else if (data?.screen === 'settings') {
          setActiveTab('settings');
        } else if (data?.screen === 'store' || data?.screen === 'pro' || data?.screen === 'premium') {
          openStoreRef.current();
        } else if (data?.screen === 'drop' || data?.action === 'drop') {
          setActiveTab('home');
          void fetchMemeRef.current();
        } else if (data?.screen === 'home') {
          setActiveTab('home');
        }
      },
      (notification) => {
        const title = notification.title ? `${notification.title.toUpperCase()}: ` : '';
        const body = notification.body || 'NEW MEME CAPSULE ALERT!';
        showToastRef.current(`${title}${body}`, 'secondary');
      }
    );
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('LINK SECURED TO CLIPBOARD!', 'secondary');
  };

  const shareMeme = (item: Meme) => {
    persistActiveSession(true);
    setShowReactionPicker(false);
    setShowBoardPicker(false);
    setShareTargetMeme(item);
  };

  const executeNativeShare = async (item: Meme, customShareMessage?: string) => {
    persistActiveSession(true);
    const displayTitle = item.source === 'Reddit' ? item.title : 'Meme Capsule Drop';
    const shareMessage = customShareMessage || buildMemeShareMessage(item);

    if (window.MemeCapsuleAndroid) {
      showToast('PREPARING SHARE...', 'secondary');
      if (window.MemeCapsuleAndroid.shareImageToApp) {
        window.MemeCapsuleAndroid.shareImageToApp(item.url, safeFileName(displayTitle), shareMessage, '');
      } else {
        window.MemeCapsuleAndroid.shareImage(item.url, safeFileName(displayTitle), shareMessage);
      }
      if (item.id) {
        trackEvent(item.id, 'share');
      }
      setShareTargetMeme(null);
      return;
    }

    try {
      await Share.share({
        title: displayTitle,
        text: shareMessage,
        url: item.url,
        dialogTitle: 'SHARE MEME CAPSULE DROP',
      });
      showToast('SHARED SUCCESSFULLY!', 'success');
      trackEvent(item.id || item.url, 'share');
      setShareTargetMeme(null);
    } catch (error) {
      if (navigator.share) {
        try {
          await navigator.share({ title: displayTitle, text: shareMessage, url: item.url });
          if (item.id) {
            trackEvent(item.id, 'share');
          }
          setShareTargetMeme(null);
          return;
        } catch (e) {
          copyToClipboard(`${shareMessage}\n${item.url}`);
        }
      } else {
        copyToClipboard(`${shareMessage}\n${item.url}`);
      }
    }
  };

  const executeAppShare = async (item: Meme, shareMessage: string, targetPackage: string, appName: string) => {
    persistActiveSession(true);
    const displayTitle = item.source === 'Reddit' ? item.title : 'Meme Capsule Drop';

    if (window.MemeCapsuleAndroid) {
      showToast(`SHARING TO ${appName.toUpperCase()}...`, 'secondary');
      if (window.MemeCapsuleAndroid.shareImageToApp) {
        window.MemeCapsuleAndroid.shareImageToApp(item.url, safeFileName(displayTitle), shareMessage, targetPackage);
      } else {
        window.MemeCapsuleAndroid.shareImage(item.url, safeFileName(displayTitle), shareMessage);
      }
      if (item.id) {
        trackEvent(item.id, 'share');
      }
      setShareTargetMeme(null);
      return;
    }

    // Web fallbacks for social targets
    const encodedText = encodeURIComponent(`${shareMessage}\n\n🖼️ ${item.url}`);
    const encodedUrl = encodeURIComponent(item.url);

    if (appName === 'WhatsApp') {
      window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank', 'noopener,noreferrer');
      trackEvent(item.id || item.url, 'share');
      return;
    }
    if (appName === 'Telegram') {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer');
      trackEvent(item.id || item.url, 'share');
      return;
    }
    if (appName.startsWith('X')) {
      window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank', 'noopener,noreferrer');
      trackEvent(item.id || item.url, 'share');
      return;
    }
    if (appName === 'Facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer');
      trackEvent(item.id || item.url, 'share');
      return;
    }

    // Instagram / Discord on Web: copy message + trigger native share
    await executeNativeShare(item, shareMessage);
  };

  const toggleFavorite = (m: Meme) => {
    const exists = favorites.some((f) => f.url === m.url);

    // Vault limit for free users
    if (!exists && !isPro && favorites.length >= FREE_VAULT_LIMIT) {
      showToast('VAULT FULL! REMOVE A MEME TO SAVE ANOTHER.', 'tertiary');
      return;
    }

    const updated = exists ? favorites.filter((f) => f.url !== m.url) : [...favorites, { ...m, savedAt: Date.now() }];
    setFavorites(updated);
    localStorage.setItem('meme_favorites', JSON.stringify(updated));
    showToast(exists ? 'REMOVED FROM VAULT' : 'SECURED IN VAULT!', exists ? 'tertiary' : 'success');
  };

  const handleCardDismiss = useCallback((decision: DismissDecision, dismissedMeme: Meme) => {
    setShowReactionPicker(false);
    setShowBoardPicker(false);

    // Track analytics silently in the background (no noisy toasts, no auto-saving to vault)
    if (dismissedMeme.id) {
      trackEvent(dismissedMeme.id, decision === 'keep' ? 'keep' : 'skip');
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

    // 3. Advance to the next meme in the FIFO queue
    const activeQueue = memeQueueRef.current.length > 0 ? memeQueueRef.current : memeQueue;
    if (activeQueue.length > 0) {
      const [nextMeme, ...remainingQueue] = activeQueue;
      memeQueueRef.current = remainingQueue;
      setImageFailed(false);
      setMeme(nextMeme);
      setMemeQueue(remainingQueue);
      addToSeenMemes(nextMeme.url, nextMeme.id);
      persistSeenMemes();

      const nextViewed = totalMemesViewed + 1;
      setTotalMemesViewed(nextViewed);
      setTotalMemesFetched(Math.max(totalMemesFetched, nextViewed));
      localStorage.setItem('total_memes_viewed', nextViewed.toString());
      localStorage.setItem('total_memes_fetched', Math.max(totalMemesFetched, nextViewed).toString());

      setMemeHistory((prev) => [...prev.slice(-14), nextMeme]);
      setHistoryIndex(-1);

      if (nextMeme.id) trackEvent(nextMeme.id, 'view');

      // Trigger fetching the next stack as soon as 60%-70% of the loaded memes have been viewed
      recordStackConsumptionAndMaybeRefill(remainingQueue.length, nextViewed + queueFetchCounter);
    } else {
      void advanceInlineWithoutLoadingScreen();
    }
  }, [
    memeQueue,
    totalMemesViewed,
    totalMemesFetched,
    queueFetchCounter,
    isMultiDropView,
    multiDropMemes,
    multiDropIndex,
    recordStackConsumptionAndMaybeRefill,
    advanceInlineWithoutLoadingScreen,
    trackEvent,
    toggleFavorite,
    addToSeenMemes,
    persistSeenMemes,
  ]);

  const requestBoardCreation = () => {
    if (!canCreateBoard(moodBoards.length, entitlements.unlimitedBoards)) {
      setBoardLimitReached(true);
      setActiveTab('boards');
      return;
    }
    setIsBoardComposerOpen(true);
  };

  const createMoodBoard = (customTitle?: string, customColor?: MoodBoard['color']) => {
    if (!canCreateBoard(moodBoards.length, entitlements.unlimitedBoards)) {
      setIsBoardComposerOpen(false);
      setBoardLimitReached(true);
      setActiveTab('boards');
      return;
    }
    const raw = customTitle || boardTitle;
    const title = raw.trim() || `CHAOS BOARD ${moodBoards.length + 1}`;
    const colors: MoodBoard['color'][] = ['primary', 'secondary', 'tertiary'];
    const board: MoodBoard = {
      id: `board-${Date.now()}`,
      title: title.toUpperCase(),
      color: customColor || colors[moodBoards.length % colors.length],
      memeUrls: [],
      createdAt: Date.now(),
    };
    const updated = [board, ...moodBoards];
    setMoodBoards(updated);
    setSelectedBoardId(board.id);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updated));
    setBoardTitle('');
    setIsBoardComposerOpen(false);
    showToast(`BOARD "${board.title}" BUILT!`, 'success');
  };

  const toggleMemeOnBoard = (boardId: string, item: Meme) => {
    let isNowPinned = false;
    let targetBoardTitle = '';

    const updatedBoards = moodBoards.map((board) => {
      if (board.id !== boardId) return board;
      targetBoardTitle = board.title;
      const isPinned = board.memeUrls.includes(item.url);
      isNowPinned = !isPinned;
      return {
        ...board,
        memeUrls: isPinned
          ? board.memeUrls.filter((url) => url !== item.url)
          : [...board.memeUrls, item.url],
      };
    });

    setMoodBoards(updatedBoards);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updatedBoards));

    // Ensure pinnedMemes is fully synchronized
    setPinnedMemes((prev) => {
      let nextPins: Meme[];
      if (isNowPinned) {
        if (!prev.some((p) => p.url === item.url)) {
          nextPins = [{ ...item, savedAt: Date.now() }, ...prev];
        } else {
          nextPins = prev;
        }
      } else {
        const stillInOtherBoard = updatedBoards.some((b) => b.memeUrls.includes(item.url));
        nextPins = stillInOtherBoard ? prev : prev.filter((p) => p.url !== item.url);
      }
      localStorage.setItem('meme_pinboard', JSON.stringify(nextPins));
      return nextPins;
    });

    showToast(
      isNowPinned ? `PINNED TO "${targetBoardTitle || 'BOARD'}"!` : `REMOVED FROM "${targetBoardTitle || 'BOARD'}"`,
      isNowPinned ? 'success' : 'tertiary'
    );
  };

  const removeMoodBoard = (boardId: string) => {
    const target = moodBoards.find((b) => b.id === boardId);
    const updated = moodBoards.filter((board) => board.id !== boardId);
    setMoodBoards(updated);
    setSelectedBoardId(null);
    localStorage.setItem('meme_mood_boards', JSON.stringify(updated));
    showToast(target ? `DEMOLISHED "${target.title}"` : 'BOARD DEMOLISHED', 'tertiary');
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

  const togglePin = (m: Meme) => {
    const isPinned = pinnedMemes.some((item) => item.url === m.url) || moodBoards.some((b) => b.memeUrls.includes(m.url));
    if (isPinned) {
      handleUnpin(m.url, selectedBoardId);
    } else {
      handlePin(m);
    }
  };

  const handlePin = (m: Meme) => {
    if (moodBoards.length === 0) {
      const firstBoard: MoodBoard = {
        id: `board-${Date.now()}`,
        title: 'MAIN VAULT',
        color: 'secondary',
        memeUrls: [m.url],
        createdAt: Date.now(),
      };
      const updatedBoards = [firstBoard];
      setMoodBoards(updatedBoards);
      setSelectedBoardId(firstBoard.id);
      localStorage.setItem('meme_mood_boards', JSON.stringify(updatedBoards));

      setPinnedMemes((prev) => {
        const nextPins = [{ ...m, savedAt: Date.now() }, ...prev.filter((p) => p.url !== m.url)];
        localStorage.setItem('meme_pinboard', JSON.stringify(nextPins));
        return nextPins;
      });

      showToast('PINNED TO MAIN VAULT ✓', 'success');
      return;
    }

    const targetBoard = selectedBoardId
      ? moodBoards.find((b) => b.id === selectedBoardId) || moodBoards[0]
      : moodBoards[0];

    toggleMemeOnBoard(targetBoard.id, m);
  };

  const handleUnpin = (memeUrl: string, fromBoardId?: string | null) => {
    if (fromBoardId) {
      let targetTitle = '';
      const updatedBoards = moodBoards.map((board) => {
        if (board.id !== fromBoardId) return board;
        targetTitle = board.title;
        return {
          ...board,
          memeUrls: board.memeUrls.filter((url) => url !== memeUrl),
        };
      });
      setMoodBoards(updatedBoards);
      localStorage.setItem('meme_mood_boards', JSON.stringify(updatedBoards));

      setPinnedMemes((prev) => {
        const stillInOtherBoard = updatedBoards.some((b) => b.memeUrls.includes(memeUrl));
        const nextPins = stillInOtherBoard ? prev : prev.filter((p) => p.url !== memeUrl);
        localStorage.setItem('meme_pinboard', JSON.stringify(nextPins));
        return nextPins;
      });

      showToast(`REMOVED FROM "${targetTitle || 'BOARD'}"`, 'tertiary');
    } else {
      const updatedBoards = moodBoards.map((board) => ({
        ...board,
        memeUrls: board.memeUrls.filter((url) => url !== memeUrl),
      }));
      setMoodBoards(updatedBoards);
      localStorage.setItem('meme_mood_boards', JSON.stringify(updatedBoards));

      setPinnedMemes((prev) => {
        const nextPins = prev.filter((p) => p.url !== memeUrl);
        localStorage.setItem('meme_pinboard', JSON.stringify(nextPins));
        return nextPins;
      });

      showToast('REMOVED FROM MOODBOARD', 'tertiary');
    }
  };

  const getMemeForUrl = useCallback((url: string): Meme => {
    const fromPinned = pinnedMemes.find((p) => p.url === url);
    if (fromPinned) return fromPinned;
    const fromFav = favorites.find((f) => f.url === url);
    if (fromFav) return fromFav;
    const fromDeck = deckMemes.find((d) => d.url === url);
    if (fromDeck) return fromDeck;
    const fromQueue = memeQueue.find((q) => q.url === url);
    if (fromQueue) return fromQueue;
    return {
      url,
      title: 'PINNED MEME',
      author: 'MemeCapsule',
      source: 'Meme Capsule',
      savedAt: Date.now(),
    };
  }, [pinnedMemes, favorites, deckMemes, memeQueue]);

  const downloadMeme = async (item: Meme) => {
    if (!item || !item.url) {
      showToast('NO MEME TO DOWNLOAD', 'tertiary');
      return;
    }

    const fileName = safeFileName(item.title);

    if (window.MemeCapsuleAndroid) {
      showToast('DOWNLOADING TO GALLERY...', 'secondary');
      try {
        window.MemeCapsuleAndroid.downloadImage(item.url, fileName);
        if (item.id) {
          trackEvent(item.id, 'download');
        }
      } catch (err) {
        console.error('Native download error:', err);
        showToast('DOWNLOAD FAILED', 'tertiary');
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

  // --- Triple Drop (Pro Feature) ---
  const fetchTripleDrop = async () => {
    if (!isPro) {
      showToast('TRIPLE DROP IS PRO ONLY!', 'tertiary');
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
        [m1, m2, m3].forEach((m) => {
          if (m?.url) {
            inFlightUrlsRef.current.delete(m.url);
            if (m.id) inFlightIdsRef.current.delete(m.id);
            addToSeenMemes(m.url, m.id);
          }
        });
        persistSeenMemes();
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
      console.error('Triple drop failed:', error);
      setErrorMsg('TRIPLE DROP LINK TIMEOUT');
      setScreen('error');
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
    <div data-theme={activeTheme} className="app-container dark min-h-screen flex flex-col font-body-md overflow-x-hidden select-none bg-background text-on-background">
      {toastText && (
        <div role="status" className={`fixed top-24 left-1/2 -translate-x-1/2 z-[1100] px-sm py-2 border-[3px] border-outline shadow-[4px_4px_0px_0px_#000] font-label-md text-xl uppercase ${
          toastType === 'success' ? 'bg-secondary-container text-on-secondary-container' :
          toastType === 'secondary' ? 'bg-primary text-on-primary' :
          toastType === 'tertiary' ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container text-on-surface'
        } transition-all animate-bounce`}>
          {toastText}
        </div>
      )}

      <DateOfBirthModal
        isOpen={isDobModalOpen}
        onConfirm={handleConfirmDob}
      />

      <PrivacyConsentModal
        isOpen={isConsentModalOpen}
        onAgree={handleAgreePolicy}
        onViewPolicy={() => window.open('https://memecapsule.wtf/privacy', '_blank', 'noopener,noreferrer')}
      />

      <PrivacyPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onAgree={isConsentModalOpen ? handleAgreePolicy : undefined}
        showAgreeButton={isConsentModalOpen}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          localStorage.setItem('has_seen_onboarding', 'true');
          trackOnboardingComplete();
          const savedDob = localStorage.getItem('meme_capsule_user_dob');
          if (!savedDob) {
            setIsDobModalOpen(true);
          }
        }}
        onOpenPrivacyPolicy={() => setIsPolicyModalOpen(true)}
      />

      {isStoreOpen && <StoreScreen onClose={closeStore} initialFocus={storeFocus} />}

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportTargetMeme(null);
        }}
        meme={reportTargetMeme || meme}
        onSubmitReport={handleSubmitReport}
        isSubmitting={isSubmittingReport}
      />

      <RedditInfoModal
        isOpen={isRedditInfoOpen}
        meme={redditInfoMeme}
        onClose={() => {
          setIsRedditInfoOpen(false);
          setRedditInfoMeme(null);
        }}
      />

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={handleDeferRating}
        onRate={handleRateApp}
        onDefer={handleDeferRating}
      />

      {/* Redesigned Unpin Confirmation Modal */}
      <UnpinModal
        isOpen={Boolean(unpinTargetMeme)}
        meme={unpinTargetMeme}
        boardTitle={selectedBoardId ? moodBoards.find((b) => b.id === selectedBoardId)?.title : undefined}
        onClose={() => setUnpinTargetMeme(null)}
        onConfirm={() => {
          if (unpinTargetMeme) {
            handleUnpin(unpinTargetMeme.url, selectedBoardId);
            setUnpinTargetMeme(null);
          }
        }}
      />

      {/* Create Mood Board Modal */}
      <CreateBoardModal
        isOpen={isBoardComposerOpen}
        onClose={() => setIsBoardComposerOpen(false)}
        onCreateBoard={(title, color) => createMoodBoard(title, color)}
      />

      {/* Neo-Brutalist Share Bottom Sheet Modal + Persistent Ribbon Above Bottom Dock */}
      <ShareModal
        isOpen={Boolean(shareTargetMeme)}
        meme={shareTargetMeme}
        activeFallbackMeme={meme || favorites[0] || pinnedMemes[0] || null}
        showRibbon={activeTab !== 'settings'}
        onOpen={() => {
          const target = meme || favorites[0] || pinnedMemes[0] || {
            url: 'https://pub-3e7961a132964ff581b779a5dad40771.r2.dev/C3VwSYoOSW__2.jpg',
            title: 'Meme Capsule Drop',
            author: 'Meme Capsule Vault',
            source: 'Meme Capsule',
          };
          setShareTargetMeme(target);
        }}
        onClose={() => setShareTargetMeme(null)}
        onShareToApp={(targetMeme, shareMsg, targetPkg, appName) =>
          executeAppShare(targetMeme, shareMsg, targetPkg, appName)
        }
        onNativeShare={(targetMeme, shareMsg) =>
          executeNativeShare(targetMeme, shareMsg)
        }
        onCopySharePayload={() => {
          if (shareTargetMeme?.id) {
            trackEvent(shareTargetMeme.id, 'share');
          }
        }}
      />

      {/* Top Header — Visible on Landing Page, disappears as soon as HIT ME is pressed */}
      {activeTab === 'home' && screen === 'waiting' && (
        <header className="bg-background flex flex-col justify-center items-start w-full px-md py-sm gap-xs sticky top-0 z-40 border-b-[3px] border-outline shadow-[4px_4px_0px_0px_var(--color-secondary-container)] animate-in fade-in duration-200">
          <div className="flex items-center justify-between w-full max-w-[1200px] mx-auto">
            {/* Left Slot: Neo-Brutalist Settings Button */}
            <div className="w-[84px] flex items-center justify-start shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="w-[38px] h-[38px] flex items-center justify-center cursor-pointer select-none transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px] active:!shadow-none"
                style={{
                  backgroundColor: '#1c1c1e',
                  border: '2px solid #000000',
                  boxShadow: '2.5px 2.5px 0px #000000',
                  touchAction: 'manipulation',
                }}
                title="Open App Settings"
                aria-label="Open App Settings"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C084FC"
                  strokeWidth="2.4"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>

            {/* Center Slot: Simple, Clean Title */}
            <h1
              onClick={() => { setActiveTab('home'); setScreen('waiting'); setMeme(null); }}
              className="font-headline-lg-mobile text-[22px] sm:text-[26px] md:text-[30px] font-bold text-white tracking-wider leading-none uppercase text-center cursor-pointer flex-1 mx-2 truncate hover:text-primary transition-colors"
              style={{ textShadow: 'none', WebkitTextStroke: '0px' }}
            >
              MEME CAPSULE
            </h1>

            {/* Right Slot: Store Button */}
            <div className="w-[84px] flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => openStore()}
                className="px-2.5 py-1.5 bg-[#f4c300] hover:bg-[#ffe399] text-black border-[2px] border-black font-label-xl text-[11px] uppercase font-bold shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1 cursor-pointer"
                title="Open Capsule Store"
              >
                <span>STORE</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow flex flex-col items-center w-full max-w-[1200px] mx-auto px-sm pt-[max(env(safe-area-inset-top),16px)] py-2 gap-2 pb-[calc(88px+max(env(safe-area-inset-bottom,0px),16px))]">
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

                  {/* HIT ME — the sole hero button */}
                  <div className="relative w-full flex items-center justify-center mb-6">
                    {/* Pulsing glow ring behind the button */}
                    <div className="absolute inset-0 max-w-[500px] mx-auto bg-primary-container/20 border-[3px] border-primary-container/30 animate-pulse" style={{ animationDuration: '2s' }} />
                    <button
                      onClick={fetchMeme}
                      className="relative w-full bg-primary-container text-on-primary-container border-[4px] border-secondary-container shadow-[6px_6px_0px_0px_var(--color-secondary-container)] py-8 px-md flex items-center justify-center active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-150 group hover:bg-primary z-10 cursor-pointer"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-tertiary border-r-[3px] border-secondary-container" />
                      <span className="font-headline-xl text-[56px] sm:text-[64px] uppercase tracking-tighter group-active:scale-[0.96] transition-transform drop-shadow-[3px_3px_0px_var(--color-tertiary)]">HIT ME</span>
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
                <div
                  className="flex flex-col items-center relative transition-all duration-200"
                  style={{
                    width: `${canvasDimensions.width}px`,
                    maxWidth: '92vw',
                  }}
                >
                  <MemeStack
                    ref={stackRef}
                    memes={deckMemes}
                    canvasDimensions={canvasDimensions}
                    onDimensionsLoaded={handleDimensionsLoaded}
                    onDismiss={handleCardDismiss}
                    isLoading={imageFailed}
                    shakeCard={shakeCard}
                    activeFxStyle={shakeEffectsEnabled ? activeFx : 'classic'}
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
                    onOpenReport={(target) => {
                      setReportTargetMeme(target || meme);
                      setIsReportModalOpen(true);
                    }}
                    onOpenRedditInfo={(target) => {
                      setRedditInfoMeme(target || meme);
                      setIsRedditInfoOpen(true);
                    }}
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
                    <>
                      {/* Dismiss backdrop when reaction picker is open */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionPicker(false);
                        }}
                      />
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="absolute left-1/2 -translate-x-1/2 bottom-4 z-50 flex items-center gap-1 bg-surface-container-highest/95 border-[3px] border-primary-container shadow-[4px_4px_0px_0px_var(--color-tertiary)] px-2 py-2 backdrop-blur-md max-w-[95%] select-none"
                      >
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
                    </>
                  )}

                  {/* Board Picker Overlay */}
                  {showBoardPicker && moodBoards.length > 0 && meme && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex flex-col gap-1 bg-surface-container-highest/95 border-[3px] border-primary-container shadow-[4px_4px_0px_0px_var(--color-tertiary)] px-2.5 py-2 backdrop-blur-md min-w-[220px] max-w-[300px]">
                      <div className="flex items-center justify-between px-1 mb-1 border-b border-outline/30 pb-1">
                        <span className="font-label-xl text-[11px] text-outline uppercase tracking-wider">PIN TO BOARD</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBoardPicker(false);
                            requestBoardCreation();
                          }}
                          className="font-label-md text-[10px] text-secondary-container hover:underline uppercase flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus size={11} strokeWidth={3} />
                          <span>NEW</span>
                        </button>
                      </div>
                      {moodBoards.map((board) => {
                        const isPinned = board.memeUrls.includes(meme.url);
                        return (
                          <button
                            key={board.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMemeOnBoard(board.id, meme);
                              setSelectedBoardId(board.id);
                              setShowBoardPicker(false);
                            }}
                            className={`flex items-center justify-between gap-2 px-2.5 py-2 transition-all text-left cursor-pointer ${
                              isPinned
                                ? 'bg-primary-container/60 border-[2px] border-secondary-container text-on-surface'
                                : 'border-[2px] border-transparent hover:bg-surface-container-low text-on-surface'
                            }`}
                            style={{ touchAction: 'manipulation' }}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 shrink-0 border border-black/40"
                                style={{ backgroundColor: getBoardHex(board.color) }}
                              />
                              <span className="font-label-xl text-[13px] uppercase truncate font-bold">{board.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-label-md text-[10px] text-outline">({board.memeUrls.length})</span>
                              {isPinned && <span className="text-[14px] text-secondary-container font-bold leading-none">✓</span>}
                            </div>
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

                {/* Four Primary Rectangular CTA Buttons Below Canvas (nav#ctaRow: LIKE -> VAULT -> PIN -> MORE) */}
                {meme && (() => {
                  const isLiked = likedMemes.includes(meme.url);
                  const isSaved = favorites.some((f) => f.url === meme.url);
                  const isPinned =
                    pinnedMemes.some((p) => p.url === meme.url) ||
                    moodBoards.some((b) => b.memeUrls.includes(meme.url));

                  const renderBurstAndInk = (btnKey: 'like' | 'vault' | 'pin' | 'more', accentHex: string) => {
                    const isCurrentEffect = ctaEffects.key === btnKey && Date.now() - ctaEffects.tick < 600;
                    return (
                      <>
                        <div className="ink-layer">
                          {isCurrentEffect && (
                            <span
                              key={`ink-${ctaEffects.tick}`}
                              className="ink-ripple"
                              style={{
                                width: `${ctaEffects.size}px`,
                                height: `${ctaEffects.size}px`,
                                left: `${ctaEffects.x}px`,
                                top: `${ctaEffects.y}px`,
                                backgroundColor: `${accentHex}55`,
                              }}
                            />
                          )}
                        </div>
                        {isCurrentEffect && (
                          <div key={`burst-${ctaEffects.tick}`} className="burst-wrapper">
                            <svg
                              viewBox="0 0 100 100"
                              className="w-full h-full animate-burst-ticks"
                              fill="none"
                              stroke={accentHex}
                              strokeWidth="4"
                              strokeLinecap="square"
                            >
                              <line x1="50" y1="2" x2="50" y2="14" />
                              <line x1="50" y1="86" x2="50" y2="98" />
                              <line x1="6" y1="24" x2="17" y2="31" />
                              <line x1="83" y1="69" x2="94" y2="76" />
                              <line x1="6" y1="76" x2="17" y2="69" />
                              <line x1="83" y1="31" x2="94" y2="24" />
                            </svg>
                          </div>
                        )}
                      </>
                    );
                  };

                  return (
                    <nav
                      id="ctaRow"
                      className="grid grid-cols-4 gap-2.5 w-full max-w-[356px] mt-3.5 relative z-40 select-none"
                    >
                      {/* Dismiss backdrop when #moreMenu popover is open */}
                      {showMoreMenu && (
                        <div
                          className="fixed inset-0 z-40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoreMenu(false);
                          }}
                        />
                      )}

                      {/* 1. LIKE */}
                      <button
                        type="button"
                        onPointerDown={() => {
                          isLikeLongPressRef.current = false;
                          if (ctaLongPressTimerRef.current) clearTimeout(ctaLongPressTimerRef.current);
                          ctaLongPressTimerRef.current = setTimeout(() => {
                            isLikeLongPressRef.current = true;
                            setShowMoreMenu(false);
                            setShowReactionPicker((prev) => !prev);
                            setShowBoardPicker(false);
                          }, 450);
                        }}
                        onPointerUp={() => {
                          if (ctaLongPressTimerRef.current) {
                            clearTimeout(ctaLongPressTimerRef.current);
                            ctaLongPressTimerRef.current = null;
                          }
                        }}
                        onPointerCancel={() => {
                          if (ctaLongPressTimerRef.current) {
                            clearTimeout(ctaLongPressTimerRef.current);
                            ctaLongPressTimerRef.current = null;
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLikeLongPressRef.current) {
                            isLikeLongPressRef.current = false;
                            return;
                          }
                          setShowMoreMenu(false);
                          triggerCtaEffect('like', '#FF2A85', e);
                          if (meme) toggleLike(meme);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowMoreMenu(false);
                          setShowReactionPicker((prev) => !prev);
                          setShowBoardPicker(false);
                        }}
                        className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                        style={{
                          background: isLiked
                            ? '#FF2A85'
                            : 'linear-gradient(180deg, #1e1318 0%, #151113 100%)',
                          borderColor: isLiked ? '#000000' : '#FF2A85',
                          color: isLiked ? '#000000' : '#FF2A85',
                        }}
                      >
                        {renderBurstAndInk('like', '#FF2A85')}
                        <div
                          key={ctaEffects.key === 'like' ? `icon-${ctaEffects.tick}` : 'icon-like'}
                          className={`relative z-10 flex items-center justify-center ${
                            ctaEffects.key === 'like' ? 'animate-burst' : ''
                          }`}
                        >
                          <Heart
                            size={22}
                            strokeWidth={2.6}
                            fill={isLiked ? '#000000' : 'none'}
                            color={isLiked ? '#000000' : '#FF2A85'}
                          />
                        </div>
                        <span
                          className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
                          style={{ color: isLiked ? '#000000' : '#FF2A85' }}
                        >
                          {isLiked ? 'LIKED' : 'LIKE'}
                        </span>
                      </button>

                      {/* 2. VAULT */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoreMenu(false);
                          triggerCtaEffect('vault', '#A855F7', e);
                          if (meme) toggleFavorite(meme);
                        }}
                        className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                        style={{
                          background: isSaved
                            ? '#A855F7'
                            : 'linear-gradient(180deg, #1b1324 0%, #141119 100%)',
                          borderColor: isSaved ? '#000000' : '#A855F7',
                          color: isSaved ? '#000000' : '#C084FC',
                        }}
                      >
                        {renderBurstAndInk('vault', '#A855F7')}
                        <div
                          key={ctaEffects.key === 'vault' ? `icon-${ctaEffects.tick}` : 'icon-vault'}
                          className={`relative z-10 flex items-center justify-center ${
                            ctaEffects.key === 'vault' ? 'animate-burst' : ''
                          }`}
                        >
                          <Bookmark
                            size={22}
                            strokeWidth={2.6}
                            fill={isSaved ? '#000000' : 'none'}
                            color={isSaved ? '#000000' : '#C084FC'}
                          />
                        </div>
                        <span
                          className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
                          style={{ color: isSaved ? '#000000' : '#C084FC' }}
                        >
                          {isSaved ? 'SAVED' : 'VAULT'}
                        </span>
                      </button>

                      {/* 3. PIN */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoreMenu(false);
                          triggerCtaEffect('pin', '#FACC15', e);
                          if (moodBoards.length > 1) {
                            setShowBoardPicker(!showBoardPicker);
                            setShowReactionPicker(false);
                          } else if (meme) {
                            togglePin(meme);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowMoreMenu(false);
                          setShowBoardPicker(!showBoardPicker);
                          setShowReactionPicker(false);
                        }}
                        className="mc-cta-btn h-[54px] flex flex-col items-center justify-center gap-1 relative"
                        style={{
                          background: isPinned
                            ? '#FACC15'
                            : 'linear-gradient(180deg, #231e12 0%, #171510 100%)',
                          borderColor: isPinned ? '#000000' : '#FACC15',
                          color: isPinned ? '#000000' : '#FACC15',
                        }}
                      >
                        {renderBurstAndInk('pin', '#FACC15')}
                        <div
                          key={ctaEffects.key === 'pin' ? `icon-${ctaEffects.tick}` : 'icon-pin'}
                          className={`relative z-10 flex items-center justify-center ${
                            ctaEffects.key === 'pin' ? 'animate-burst' : ''
                          }`}
                        >
                          <MapPin
                            size={22}
                            strokeWidth={2.6}
                            fill={isPinned ? '#000000' : 'none'}
                            color={isPinned ? '#000000' : '#FACC15'}
                          />
                        </div>
                        <span
                          className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
                          style={{ color: isPinned ? '#000000' : '#FACC15' }}
                        >
                          {isPinned ? 'PINNED' : 'PIN'}
                        </span>
                      </button>

                      {/* 4. MORE (⋮) + Anchored Secondary Popover Menu (#moreMenu: SHARE, DOWNLOAD, REPORT) */}
                      <div className="relative flex">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerCtaEffect('more', '#00E5FF', e);
                            setShowMoreMenu((prev) => !prev);
                            setShowReactionPicker(false);
                            setShowBoardPicker(false);
                          }}
                          className="mc-cta-btn h-[54px] w-full flex flex-col items-center justify-center gap-1 relative"
                          style={{
                            background: showMoreMenu
                              ? '#00E5FF'
                              : 'linear-gradient(180deg, #111a1f 0%, #0f1418 100%)',
                            borderColor: showMoreMenu ? '#000000' : '#00E5FF',
                            color: showMoreMenu ? '#000000' : '#00E5FF',
                          }}
                          aria-expanded={showMoreMenu}
                          aria-label="More Options"
                        >
                          {renderBurstAndInk('more', '#00E5FF')}
                          <div
                            key={ctaEffects.key === 'more' ? `icon-${ctaEffects.tick}` : 'icon-more'}
                            className={`relative z-10 flex items-center justify-center ${
                              ctaEffects.key === 'more' ? 'animate-burst' : ''
                            }`}
                          >
                            <MoreVertical
                              size={22}
                              strokeWidth={2.8}
                              color={showMoreMenu ? '#000000' : '#00E5FF'}
                            />
                          </div>
                          <span
                            className="relative z-10 font-mono font-bold text-[10px] uppercase tracking-wider leading-none"
                            style={{ color: showMoreMenu ? '#000000' : '#00E5FF' }}
                          >
                            MORE
                          </span>
                        </button>

                        {/* Secondary Popover Menu (#moreMenu) */}
                        {showMoreMenu && (
                          <div
                            id="moreMenu"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-full mb-3 w-48 bg-white border-4 border-black shadow-[4px_4px_0px_#000000] z-50 flex flex-col divide-y-4 divide-black"
                          >
                            {/* 1. SHARE (#A855F7) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreMenu(false);
                                if (meme) shareMeme(meme);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#A855F7] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                              style={{ touchAction: 'manipulation' }}
                            >
                              <Share2 size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                              <span>SHARE</span>
                            </button>

                            {/* 2. DOWNLOAD (#FACC15) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreMenu(false);
                                if (meme) downloadMeme(meme);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#FACC15] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                              style={{ touchAction: 'manipulation' }}
                            >
                              <Download size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                              <span>DOWNLOAD</span>
                            </button>

                            {/* 3. REPORT (#FF2A85) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoreMenu(false);
                                setReportTargetMeme(meme);
                                setIsReportModalOpen(true);
                              }}
                              className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#FF2A85] hover:brightness-105 active:brightness-95 text-black font-mono font-bold text-[13px] uppercase tracking-wider cursor-pointer text-left transition-all"
                              style={{ touchAction: 'manipulation' }}
                            >
                              <Flag size={17} strokeWidth={2.6} color="#000000" className="shrink-0" />
                              <span>REPORT</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </nav>
                  );
                })()}

                {/* Multi-Drop Gallery Navigation (if triple drop active) */}
                {isMultiDropView && multiDropMemes.length > 1 && (
                  <div
                    className="w-full bg-surface-container-low border-[3px] border-secondary-container shadow-[3px_3px_0px_0px_var(--color-primary-container)] p-2 flex items-center justify-between mt-2 select-none transition-all duration-200"
                    style={{
                      width: `${canvasDimensions.width}px`,
                      maxWidth: '92vw',
                    }}
                  >
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
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-label-md text-[15px] uppercase truncate font-bold text-on-surface block" title={fav.source === 'Reddit' ? fav.title : 'MEME CAPSULE DROP'}>{fav.source === 'Reddit' ? fav.title : 'MEME CAPSULE DROP'}</span>
                        {fav.source === 'Reddit' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRedditInfoMeme(fav);
                              setIsRedditInfoOpen(true);
                            }}
                            className="text-[9px] font-bold border border-secondary text-secondary bg-surface-container px-1 py-0.5 active:scale-95 cursor-pointer shrink-0"
                            title="View Reddit Info"
                          >
                            REDDIT
                          </button>
                        )}
                      </div>
                      <div className="flex justify-between items-center gap-xs mt-auto border-t border-outline/30 pt-xs">
                        <span className="font-label-md text-[11px] text-outline uppercase truncate max-w-[100px]">@{fav.author}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => downloadMeme(fav)} title="Download to gallery" className="bg-primary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><Download size={16} className="text-on-primary" /></button>
                          <button onClick={() => shareMeme(fav)} className="bg-secondary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><Share2 size={16} className="text-[#000]" /></button>
                          <button onClick={() => {
                            handlePin(fav);
                          }} title="Pin to mood board" className="bg-tertiary p-1 border border-background shadow-[1.5px_1.5px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center"><LayoutGrid size={16} className="text-on-tertiary" /></button>
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

        {activeTab === 'boards' && (
          <section className="w-full max-w-[900px] flex flex-col gap-md animate-in slide-in-from-bottom-6 duration-200">
            {/* Header with Title, Pins Counter and "+ NEW BOARD" Action */}
            <div className="flex flex-col gap-3 border-b-[3px] border-outline pb-sm">
              <div className="flex items-end justify-between gap-sm">
                <div>
                  <span className="font-label-md text-[13px] text-secondary-container uppercase">YOUR PERSONAL ARCHIVE</span>
                  <h2 className="font-headline-xl text-[34px] sm:text-[42px] text-primary tracking-tighter uppercase leading-none skew-x-[-3deg]">
                    MOOD BOARDS
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={requestBoardCreation}
                  className="bg-secondary-container text-on-secondary-container border-[2px] border-background px-3.5 py-1.5 font-label-xl text-[13px] uppercase shadow-[2px_2px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer font-bold shrink-0"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Plus size={16} strokeWidth={3} />
                  <span>NEW BOARD</span>
                </button>
              </div>

              {/* Mood Board Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(() => {
                  const totalUniquePins = Math.max(pinnedMemes.length, new Set(moodBoards.flatMap((b) => b.memeUrls)).size);
                  return (
                    <button
                      type="button"
                      onClick={() => setSelectedBoardId(null)}
                      className={`px-3 py-1.5 border-[2px] font-label-xl text-[12px] uppercase whitespace-nowrap transition-all cursor-pointer ${
                        selectedBoardId === null
                          ? 'bg-primary text-on-primary border-background shadow-[2px_2px_0px_0px_var(--color-secondary-container)]'
                          : 'bg-surface-container-high text-outline border-outline/30 hover:text-on-surface'
                      }`}
                      style={{ touchAction: 'manipulation' }}
                    >
                      ALL PINS ({totalUniquePins})
                    </button>
                  );
                })()}
                {moodBoards.map((b) => {
                  const isSelected = selectedBoardId === b.id;
                  const hex = getBoardHex(b.color);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBoardId(b.id)}
                      className={`px-3 py-1.5 border-[2px] font-label-xl text-[12px] uppercase whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-background shadow-[2px_2px_0px_0px_#000] font-bold text-black'
                          : 'bg-surface-container-high text-outline border-outline/30 hover:text-on-surface'
                      }`}
                      style={{
                        touchAction: 'manipulation',
                        backgroundColor: isSelected ? hex : undefined,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 shrink-0 border border-black/50"
                        style={{ backgroundColor: hex }}
                      />
                      <span>{b.title}</span>
                      <span className="opacity-75 text-[10px]">({b.memeUrls.length})</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={requestBoardCreation}
                  className="px-2.5 py-1.5 border-[2px] border-dashed border-outline/60 text-outline hover:text-secondary-container hover:border-secondary-container font-label-xl text-[12px] uppercase whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer"
                  style={{ touchAction: 'manipulation' }}
                  title="Create New Board"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>ADD</span>
                </button>
              </div>
            </div>

            {!canCreateBoard(moodBoards.length, entitlements.unlimitedBoards) && <div className="p-3 bg-surface-container border-2 border-secondary-container shadow-[4px_4px_0_#000] font-label-md">
              {boardLimitReached && <div className="mb-3">
                <p className="font-headline-lg text-[16px] text-[#f4c300] uppercase mb-1.5">
                  BOARD LIMIT REACHED ({FREE_BOARD_LIMIT}/{FREE_BOARD_LIMIT}) - GET BOARD BOSS FOR UNLIMITED BOARDS
                </p>
                <button
                  type="button"
                  onClick={() => openStore({ focus: PRODUCTS.UNLIMITED_BOARDS })}
                  className="bg-secondary-container text-black px-4 py-2 border-2 border-black font-label-xl text-[13px] uppercase shadow-[2px_2px_0_#000] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer font-bold"
                >
                  UNLOCK UNLIMITED BOARDS
                </button>
              </div>}
              <button disabled={rewardBusy} onClick={() => void watchForBoard()} className="p-2 bg-primary-container border-2 border-black text-white disabled:opacity-50 font-label-xl text-[12px] uppercase cursor-pointer">{entitlements.adsRemoved ? 'CLAIM +1 SESSION SLOT' : '🔒 WATCH AD FOR +1 SLOT'}</button>
              <p className="text-xs mt-2 text-outline">Extra creation slots last this session. Your saved boards stay.</p>
            </div>}

            {/* Board Content Section */}
            {(() => {
              const currentBoard = selectedBoardId ? moodBoards.find((b) => b.id === selectedBoardId) : null;
              const displayMemes: Meme[] = currentBoard
                ? currentBoard.memeUrls.map((url) => getMemeForUrl(url))
                : (pinnedMemes.length > 0
                    ? pinnedMemes
                    : Array.from(new Set(moodBoards.flatMap((b) => b.memeUrls))).map((url) => getMemeForUrl(url)));

              return (
                <>
                  {currentBoard && (
                    <div
                      className="flex items-center justify-between bg-surface-container border-[2px] border-outline p-2.5 shadow-[2px_2px_0px_0px_#000]"
                      style={{ borderLeftColor: getBoardHex(currentBoard.color), borderLeftWidth: '5px' }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 border border-background shrink-0"
                          style={{ backgroundColor: getBoardHex(currentBoard.color) }}
                        />
                        <span className="font-label-xl text-[14px] text-on-surface uppercase font-bold tracking-wide">
                          {currentBoard.title}
                        </span>
                        <span className="font-label-md text-[11px] text-outline uppercase">
                          • {displayMemes.length} {displayMemes.length === 1 ? 'MEME' : 'MEMES'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMoodBoard(currentBoard.id)}
                        className="text-outline hover:text-error text-[11px] font-label-xl uppercase flex items-center gap-1 transition-colors px-2 py-1 border border-outline/30 hover:border-error cursor-pointer"
                        title="Delete this mood board"
                      >
                        <Trash2 size={13} />
                        <span>DELETE BOARD</span>
                      </button>
                    </div>
                  )}

                  {displayMemes.length === 0 ? (
                    <div className="bg-surface-container border-[4px] border-dashed border-primary-container shadow-[6px_6px_0px_0px_var(--color-secondary-container)] py-xl px-md text-center flex flex-col items-center gap-sm">
                      <LayoutGrid size={58} className="text-primary" />
                      <h3 className="font-headline-xl text-[28px] sm:text-[32px] uppercase text-on-surface leading-none">
                        {currentBoard ? `"${currentBoard.title}" IS EMPTY.` : 'NO PINS YET.'}
                      </h3>
                      <p className="font-label-md text-outline uppercase max-w-[380px]">
                        {currentBoard
                          ? 'Tap the PIN button on any meme in your feed to add it to this board.'
                          : 'Collect the memes that define a mood, a phase, or a very specific 3 AM thought. Tap the PIN button on any meme to save it here.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('home')}
                          className="bg-primary text-on-primary border-[3px] border-background px-5 py-2 font-label-xl uppercase shadow-[3px_3px_0px_0px_var(--color-tertiary)] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer"
                        >
                          FIND MEMES
                        </button>
                        <button
                          type="button"
                          onClick={requestBoardCreation}
                          className="bg-secondary-container text-on-secondary-container border-[3px] border-background px-5 py-2 font-label-xl uppercase shadow-[3px_3px_0px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none cursor-pointer font-bold"
                        >
                          + CREATE BOARD
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="columns-2 sm:columns-3 gap-sm pb-12">
                      {displayMemes.map((item) => {
                        const displayTitle = item.source === 'Reddit' && item.title ? item.title : 'MEME CAPSULE DROP';
                        return (
                          <article
                            key={item.url}
                            className="break-inside-avoid mb-sm bg-surface-container-low border-[3px] border-outline shadow-[3px_3px_0px_0px_#000] p-1.5 relative group select-none cursor-pointer transition-transform active:scale-[0.98]"
                            title="Long press to unpin"
                            style={{ touchAction: 'pan-y' }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setUnpinTargetMeme(item);
                            }}
                            onPointerDown={() => {
                              unpinTimerRef.current = setTimeout(() => {
                                setUnpinTargetMeme(item);
                              }, 500);
                            }}
                            onPointerMove={() => {
                              if (unpinTimerRef.current) {
                                clearTimeout(unpinTimerRef.current);
                                unpinTimerRef.current = null;
                              }
                            }}
                            onPointerUp={() => {
                              if (unpinTimerRef.current) {
                                clearTimeout(unpinTimerRef.current);
                                unpinTimerRef.current = null;
                              }
                            }}
                            onPointerLeave={() => {
                              if (unpinTimerRef.current) {
                                clearTimeout(unpinTimerRef.current);
                                unpinTimerRef.current = null;
                              }
                            }}
                            onPointerCancel={() => {
                              if (unpinTimerRef.current) {
                                clearTimeout(unpinTimerRef.current);
                                unpinTimerRef.current = null;
                              }
                            }}
                          >
                            <div className="relative overflow-hidden">
                              <img
                                src={item.url}
                                alt={displayTitle}
                                className="w-full max-h-[260px] object-cover border-[2px] border-background pointer-events-none"
                                loading="lazy"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnpinTargetMeme(item);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                title="Unpin meme"
                                className="absolute right-2 top-2 bg-tertiary-container text-on-tertiary-container border-[2px] border-background w-7 h-7 flex items-center justify-center opacity-95 hover:opacity-100 active:scale-90 transition-all shadow-[2px_2px_0px_0px_#000] cursor-pointer"
                                style={{ touchAction: 'manipulation' }}
                              >
                                <X size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <p className="font-label-md text-[11px] text-on-surface uppercase leading-tight truncate flex-1 pr-1" title={displayTitle}>
                                {displayTitle}
                              </p>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); downloadMeme(item); }}
                                  title="Download"
                                  className="text-outline hover:text-primary transition-colors p-0.5 cursor-pointer"
                                >
                                  <Download size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); shareMeme(item); }}
                                  title="Share"
                                  className="text-outline hover:text-secondary transition-colors p-0.5 cursor-pointer"
                                >
                                  <Share2 size={14} />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="w-full max-w-[700px] flex flex-col gap-md animate-in slide-in-from-bottom-6 duration-200">
            {/* Settings Tab Card */}
            <div className="bg-surface-container border-[4px] border-secondary-container shadow-[6px_6px_0px_0px_var(--color-primary-container)] p-md flex flex-col gap-md">
              <div className="border-b-[3px] border-outline pb-sm flex items-center justify-between gap-sm">
                <div>
                  <span className="font-label-md text-[12px] text-secondary-container uppercase tracking-widest block">
                    SYSTEM CONTROL & PRIVACY
                  </span>
                  <h2 className="font-headline-xl text-[36px] sm:text-[42px] text-white tracking-tighter uppercase leading-none skew-x-[-3deg]">
                    APP SETTINGS
                  </h2>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-low border-[2px] border-outline px-3 py-1.5 shadow-[2px_2px_0px_0px_#000]">
                  <Settings size={17} className="text-secondary-container animate-spin" style={{ animationDuration: '10s' }} />
                  <span className="font-label-md text-[11px] text-white uppercase font-bold tracking-wider">
                    CONFIG
                  </span>
                </div>
              </div>

              {/* Category Segmented Control */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#161616] border-[2px] border-outline/50 shadow-[2px_2px_0px_0px_#000]">
                <button
                  type="button"
                  onClick={() => setSettingsTab('experience')}
                  className={`py-2 px-1 text-center font-label-xl text-[11px] sm:text-[12px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'experience'
                      ? 'bg-[#f4c300] text-black font-extrabold border-[2px] border-black shadow-[2px_2px_0_#000]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Zap size={13} className={settingsTab === 'experience' ? 'text-black' : 'text-[#f4c300]'} />
                  <span>EXPERIENCE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('membership')}
                  className={`py-2 px-1 text-center font-label-xl text-[11px] sm:text-[12px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'membership'
                      ? 'bg-[#f4c300] text-black font-extrabold border-[2px] border-black shadow-[2px_2px_0_#000]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Crown size={13} className={settingsTab === 'membership' ? 'text-black' : 'text-primary'} />
                  <span>MEMBERSHIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('privacy')}
                  className={`py-2 px-1 text-center font-label-xl text-[11px] sm:text-[12px] uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    settingsTab === 'privacy'
                      ? 'bg-[#f4c300] text-black font-extrabold border-[2px] border-black shadow-[2px_2px_0_#000]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Shield size={13} className={settingsTab === 'privacy' ? 'text-black' : 'text-tertiary'} />
                  <span>PRIVACY</span>
                </button>
              </div>

              {/* TAB 1: CAPSULE EXPERIENCE & CUSTOMIZATION */}
              {settingsTab === 'experience' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                  {/* Feed Experience Toggles */}
                  <div className="flex flex-col gap-2">
                    <span className="font-label-xl text-[13px] text-secondary-container uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={15} />
                      <span>FEED & DROP BEHAVIOUR</span>
                    </span>

                    {/* Hybrid Reddit Relay Stream */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex flex-col">
                        <span className="font-label-xl text-[14px] text-white uppercase font-bold">
                          HYBRID REDDIT RELAY STREAM
                        </span>
                        <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                          Mixes fresh SFW Reddit memes every 3rd drop alongside the curated D1 Vault.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleRedditStream}
                        className={`w-[60px] h-[32px] border-[2px] border-black font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                          redditStreamEnabled
                            ? 'bg-[#34c759] text-black font-bold'
                            : 'bg-surface-container-high text-outline'
                        }`}
                      >
                        {redditStreamEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* 7-Meme Turbo Prefetch Buffer */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex flex-col">
                        <span className="font-label-xl text-[14px] text-white uppercase font-bold">
                          7-MEME TURBO PREFETCH BUFFER
                        </span>
                        <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                          Preloads up to 7 capsules for zero-latency swiping. Turn off to save data.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={togglePrefetchBuffer}
                        className={`w-[60px] h-[32px] border-[2px] border-black font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                          prefetchEnabled
                            ? 'bg-[#34c759] text-black font-bold'
                            : 'bg-surface-container-high text-outline'
                        }`}
                      >
                        {prefetchEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    {/* Card Shake & Recoil */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex flex-col">
                        <span className="font-label-xl text-[14px] text-white uppercase font-bold">
                          CARD RECOIL & SHAKE EFFECTS
                        </span>
                        <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                          Physical arcade recoil when double-tapping or stamping reactions.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleShakeEffects}
                        className={`w-[60px] h-[32px] border-[2px] border-black font-label-xl text-[12px] uppercase shadow-[2px_2px_0px_0px_#000] transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                          shakeEffectsEnabled
                            ? 'bg-[#34c759] text-black font-bold'
                            : 'bg-surface-container-high text-outline'
                        }`}
                      >
                        {shakeEffectsEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Arcade FX Style Selector */}
                  <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex flex-col gap-2 shadow-[2px_2px_0px_0px_#000]">
                    <div className="flex items-center justify-between">
                      <span className="font-label-xl text-[14px] text-white uppercase font-bold">
                        ARCADE CARD RECOIL FX
                      </span>
                      <span className="font-label-md text-[10px] text-outline uppercase">
                        {entitlements.grants.has('fx_arcade') ? 'PACK UNLOCKED' : '1 OF 4 UNLOCKED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['classic', 'retro_slam', 'neon_glitch', 'cassette_pop'] as ArcadeFxStyle[]).map((styleId) => {
                        const isOwned = styleId === 'classic' || entitlements.grants.has('fx_arcade');
                        const isSelected = activeFx === styleId;
                        const cfg = ARCADE_FX_STYLES[styleId];
                        return (
                          <button
                            key={styleId}
                            type="button"
                            onClick={() => {
                              if (isOwned) {
                                setActiveFx(styleId);
                              } else {
                                openStore({ focus: PRODUCTS.FX_ARCADE });
                              }
                            }}
                            className={`border-2 p-2 font-label-md text-[11px] uppercase flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-primary-container text-white border-black font-bold shadow-[2px_2px_0_#000]'
                                : isOwned
                                ? 'bg-[#1c1b1b] text-neutral-300 border-outline hover:text-white'
                                : 'bg-[#161616] text-neutral-500 border-neutral-700'
                            }`}
                          >
                            <span>{cfg.name}</span>
                            <span>{isOwned ? (isSelected ? '✓' : '') : '🔒'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* App Color Themes */}
                  <ThemePicker onOpenStore={(focus) => openStore({ focus })} />
                </div>
              )}

              {/* TAB 2: MEMBERSHIP & STORE */}
              {settingsTab === 'membership' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                  {/* Hero Store Card */}
                  <div className="bg-gradient-to-br from-[#241d08] via-[#1c1b1b] to-[#141414] border-[3px] border-[#f4c300] shadow-[4px_4px_0px_0px_#000] p-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Crown size={18} className="text-[#f4c300]" />
                        <span className="font-headline-xl text-[20px] text-white uppercase tracking-tight">
                          CAPSULE STORE
                        </span>
                      </div>
                      <span className="font-label-md text-[10px] bg-[#f4c300] text-black px-1.5 py-0.5 border border-black uppercase font-extrabold">
                        ONE-TIME UNLOCKS
                      </span>
                    </div>
                    <p className="font-sans text-[12px] text-neutral-300 leading-snug">
                      Unlock Remove Ads, Unlimited Mood Boards, and the flagship Combo Pack. All purchases are permanent and bound to your Google Play account.
                    </p>
                    <button
                      type="button"
                      onClick={() => openStore()}
                      className="w-full mt-1 bg-[#f4c300] hover:bg-[#ffe399] text-black border-[2px] border-black py-2.5 font-label-xl text-[13px] uppercase font-extrabold shadow-[3px_3px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={16} strokeWidth={2.5} />
                      <span>OPEN CAPSULE STORE</span>
                    </button>
                  </div>

                  {/* Quick Membership Actions Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isPurchasing}
                      onClick={() => void restorePurchases()}
                      className="bg-surface-container-low hover:bg-surface-container-high text-white border-[2px] border-outline p-3 font-label-xl text-[12px] uppercase shadow-[2px_2px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center disabled:opacity-50 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <RotateCcw size={18} className="text-[#9b30ff]" />
                      <span>{isPurchasing ? 'CHECKING…' : 'RESTORE PURCHASES'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRatingModalOpen(true)}
                      className="bg-surface-container-low hover:bg-surface-container-high text-white border-[2px] border-outline p-3 font-label-xl text-[12px] uppercase shadow-[2px_2px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <Star size={18} className="text-[#f4c300]" />
                      <span>RATE ON PLAY STORE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOnboardingOpen(true)}
                      className="bg-surface-container-low hover:bg-surface-container-high text-white border-[2px] border-outline p-3 font-label-xl text-[12px] uppercase shadow-[2px_2px_0_#000] flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                    >
                      <HelpCircle size={18} className="text-tertiary" />
                      <span>REPLAY GESTURE TOUR</span>
                    </button>
                  </div>

                  {/* Entitlement Status Card */}
                  <div className="p-3 bg-black/40 border-[2px] border-outline/40 space-y-2 text-[12px]">
                    <span className="font-label-md text-[10px] text-neutral-400 uppercase tracking-widest block font-bold">
                      YOUR ACCOUNT ENTITLEMENTS
                    </span>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>ADS STATUS:</span>
                      <strong className={entitlements.adsRemoved ? 'text-[#ceff8c]' : 'text-neutral-400'}>
                        {entitlements.adsRemoved ? 'REMOVED ✓' : 'STANDARD'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300">
                      <span>MOOD BOARDS:</span>
                      <strong className={entitlements.unlimitedBoards ? 'text-[#ceff8c]' : 'text-neutral-400'}>
                        {entitlements.unlimitedBoards ? 'UNLIMITED ✓' : 'FREE CAP (3)'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PRIVACY & DATA */}
              {settingsTab === 'privacy' && (
                <div className="flex flex-col gap-3 animate-in fade-in duration-150">
                  {/* Local Device Footprint Counters */}
                  <div className="flex flex-col gap-1.5">
                    <span className="font-label-xl text-[12px] text-outline uppercase tracking-wider">
                      LOCAL DEVICE FOOTPRINT
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className="bg-surface-container-low border-[2px] border-outline p-2 text-center shadow-[2px_2px_0px_0px_#000]">
                        <span className="block font-label-md text-[9px] text-outline uppercase truncate">Viewed</span>
                        <span className="block font-headline-xl text-[20px] text-primary uppercase leading-tight">{totalMemesViewed}</span>
                      </div>
                      <div className="bg-surface-container-low border-[2px] border-outline p-2 text-center shadow-[2px_2px_0px_0px_#000]">
                        <span className="block font-label-md text-[9px] text-outline uppercase truncate">Saved</span>
                        <span className="block font-headline-xl text-[20px] text-secondary-container uppercase leading-tight">
                          {favorites.length}{!isPro ? `/${FREE_VAULT_LIMIT}` : ''}
                        </span>
                      </div>
                      <div className="bg-surface-container-low border-[2px] border-outline p-2 text-center shadow-[2px_2px_0px_0px_#000]">
                        <span className="block font-label-md text-[9px] text-outline uppercase truncate">Boards</span>
                        <span className="block font-headline-xl text-[20px] text-tertiary uppercase leading-tight">{moodBoards.length}</span>
                      </div>
                      <div className="bg-surface-container-low border-[2px] border-outline p-2 text-center shadow-[2px_2px_0px_0px_#000]">
                        <span className="block font-label-md text-[9px] text-outline uppercase truncate">Blocked</span>
                        <span className="block font-headline-xl text-[20px] text-white uppercase leading-tight">{blockedMemesCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Erasure Actions */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="font-label-xl text-[13px] text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                        <Trash2 size={15} />
                        <span>HISTORY & DATA ERASURE</span>
                      </span>
                      <span className="font-label-md text-[10px] text-outline uppercase">100% ON-DEVICE</span>
                    </div>

                    {/* Clear Viewing History */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex flex-col">
                        <span className="font-label-xl text-[13px] text-white uppercase font-bold">
                          CLEAR VIEWING HISTORY
                        </span>
                        <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                          Resets viewed/like stats while keeping your Vault & Mood Boards safe.
                        </span>
                      </div>
                      {confirmWipeMode === 'history' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleClearViewHistory}
                            className="bg-[#ff2a2a] text-white border-[2px] border-black px-2.5 py-1 font-label-xl text-[11px] uppercase shadow-[1px_1px_0_#000] cursor-pointer"
                          >
                            CONFIRM
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWipeMode('none')}
                            className="bg-neutral-800 text-white border border-outline px-2 py-1 font-label-xl text-[11px] uppercase cursor-pointer"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWipeMode('history')}
                          className="bg-surface-container-high hover:bg-primary text-white border-[2px] border-outline px-3 py-1.5 font-label-xl text-[11px] uppercase shadow-[2px_2px_0_#000] shrink-0 cursor-pointer"
                        >
                          CLEAR
                        </button>
                      )}
                    </div>

                    {/* Empty Vault & Boards */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                      <div className="flex flex-col">
                        <span className="font-label-xl text-[13px] text-white uppercase font-bold">
                          EMPTY VAULT & BOARDS
                        </span>
                        <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                          Removes all saved Vault memes ({favorites.length}) and custom Mood Boards ({moodBoards.length}).
                        </span>
                      </div>
                      {confirmWipeMode === 'vault' ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleClearVaultAndBoards}
                            className="bg-[#ff2a2a] text-white border-[2px] border-black px-2.5 py-1 font-label-xl text-[11px] uppercase shadow-[1px_1px_0_#000] cursor-pointer"
                          >
                            CONFIRM
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWipeMode('none')}
                            className="bg-neutral-800 text-white border border-outline px-2 py-1 font-label-xl text-[11px] uppercase cursor-pointer"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWipeMode('vault')}
                          className="bg-surface-container-high hover:bg-tertiary text-white border-[2px] border-outline px-3 py-1.5 font-label-xl text-[11px] uppercase shadow-[2px_2px_0_#000] shrink-0 cursor-pointer"
                        >
                          EMPTY
                        </button>
                      )}
                    </div>

                    {/* Unblock Reported Memes */}
                    {blockedMemesCount > 0 && (
                      <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_#000]">
                        <div className="flex flex-col">
                          <span className="font-label-xl text-[13px] text-white uppercase font-bold">
                            UNBLOCK REPORTED MEMES ({blockedMemesCount})
                          </span>
                          <span className="font-sans text-[11px] text-neutral-400 leading-snug">
                            Clears your local blocklist so previously hidden memes can appear again.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearBlockedMemes}
                          className="bg-surface-container-high hover:bg-secondary-container hover:text-black text-white border-[2px] border-outline px-3 py-1.5 font-label-xl text-[11px] uppercase shadow-[2px_2px_0_#000] shrink-0 cursor-pointer"
                        >
                          UNBLOCK ALL
                        </button>
                      </div>
                    )}

                    {/* Master Delete All App Data */}
                    <div className="bg-[#2a1215] border-[2px] border-[#ff2a2a] p-3 flex flex-col gap-2 shadow-[3px_3px_0px_0px_#ff2a2a]">
                      <div className="flex flex-col">
                        <span className="font-headline-lg-mobile text-[16px] text-[#ff4d4d] uppercase leading-none">
                          DELETE ALL APP HISTORY & DATA
                        </span>
                        <span className="font-sans text-[11px] text-neutral-300 mt-0.5 leading-snug">
                          Permanently wipes all history, favorites, mood boards, and cache from this device.
                        </span>
                      </div>
                      {confirmWipeMode === 'all' ? (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleWipeAllAppData}
                            className="flex-1 bg-[#ff2a2a] text-white border-[2px] border-black py-2 px-3 font-label-xl text-[12px] uppercase shadow-[2px_2px_0_#000] cursor-pointer font-bold"
                          >
                            ⚠️ YES, DELETE ALL
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmWipeMode('none')}
                            className="bg-neutral-800 text-white border border-outline py-2 px-3 font-label-xl text-[12px] uppercase cursor-pointer"
                          >
                            CANCEL
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmWipeMode('all')}
                          className="w-full bg-[#ff2a2a] hover:brightness-110 text-white border-[2px] border-black py-2 px-3 font-label-xl text-[12px] uppercase shadow-[2px_2px_0_#000] transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                        >
                          <Trash2 size={14} />
                          <span>DELETE ALL APP DATA</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Analytics Consent Management Card */}
                  <div className="bg-surface-container-low border-[2px] border-outline p-3 flex flex-col gap-2.5 shadow-[2px_2px_0_#000]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-950/60 border border-purple-800/60 p-1.5 text-purple-400">
                          <BarChart3 size={16} />
                        </div>
                        <div>
                          <span className="font-label-xl text-[13px] text-white uppercase block font-bold">
                            ANALYTICS & TELEMETRY
                          </span>
                          <span className="font-sans text-[10px] text-neutral-400 block">
                            Schema v1 • 64-char SHA-256 install hash • Zero PII
                          </span>
                        </div>
                      </div>
                      <span className={`font-label-md text-[10px] px-2 py-0.5 uppercase font-bold border ${
                        consent.analytics_consent === 'granted'
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700'
                          : 'bg-red-950/80 text-red-400 border-red-700'
                      }`}>
                        {consent.analytics_consent === 'granted' ? 'GRANTED ✓' : 'DENIED ✗'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline/30">
                      <span className="font-sans text-[11px] text-neutral-400">
                        {consent.analytics_consent === 'granted'
                          ? 'Anonymous metrics are actively helping improve humor curation.'
                          : 'All analytics collection and uploads are blocked.'}
                      </span>
                      {consent.analytics_consent === 'granted' ? (
                        <button
                          type="button"
                          onClick={() => {
                            updateConsent(false, consent.advertising_consent === 'granted');
                            showToast('ANALYTICS REVOKED. QUEUE PURGED.', 'tertiary');
                          }}
                          className="bg-neutral-800 hover:bg-neutral-700 text-red-400 border border-red-800/60 px-2.5 py-1 font-label-xl text-[11px] uppercase cursor-pointer shrink-0 transition-colors"
                        >
                          REVOKE
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            updateConsent(true, consent.advertising_consent === 'granted');
                            showToast('ANALYTICS CONSENT GRANTED ✓', 'success');
                          }}
                          className="bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-600 px-2.5 py-1 font-label-xl text-[11px] uppercase cursor-pointer shrink-0 transition-colors font-bold"
                        >
                          GRANT
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Debug-Only Analytics Inspector (Development Only) */}
                  {import.meta.env.DEV && (
                    <div className="bg-surface-container-low border-[2px] border-outline overflow-hidden shadow-[2px_2px_0_#000]">
                      <button
                        type="button"
                        onClick={() => {
                          refreshDiagnostics();
                          setIsDebugInspectorOpen(!isDebugInspectorOpen);
                        }}
                        className="w-full p-2.5 flex items-center justify-between text-left hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="bg-neutral-800 border border-outline p-1 text-primary">
                            <Sliders size={15} />
                          </div>
                          <div>
                            <span className="font-label-xl text-[12px] text-white uppercase font-bold flex items-center gap-2">
                              <span>ANALYTICS INSPECTOR (DEBUG)</span>
                              <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 rounded font-mono">
                                QUEUE: {diagnostics.queueCount}
                              </span>
                            </span>
                            <span className="font-sans text-[10px] text-neutral-400 block">
                              SQLite offline queue status & network backoff metrics
                            </span>
                          </div>
                        </div>
                        <span className="font-label-md text-[11px] text-neutral-400">
                          {isDebugInspectorOpen ? 'HIDE ▲' : 'VIEW ▼'}
                        </span>
                      </button>

                      {isDebugInspectorOpen && (
                        <div className="p-3 border-t border-outline/40 bg-neutral-950/70 flex flex-col gap-2.5 text-xs animate-in fade-in duration-150">
                          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                            <div className="bg-surface-container p-2 border border-outline/40">
                              <span className="text-neutral-500 block text-[9px] uppercase">Pending Queue</span>
                              <span className="text-white text-[13px] font-bold">{diagnostics.queueCount} events</span>
                            </div>
                            <div className="bg-surface-container p-2 border border-outline/40">
                              <span className="text-neutral-500 block text-[9px] uppercase">Accepted by Server</span>
                              <span className="text-emerald-400 text-[13px] font-bold">{diagnostics.acceptedCount}</span>
                            </div>
                            <div className="bg-surface-container p-2 border border-outline/40">
                              <span className="text-neutral-500 block text-[9px] uppercase">Rejected (HTTP 400)</span>
                              <span className="text-amber-400 text-[13px] font-bold">{diagnostics.rejectedCount}</span>
                            </div>
                            <div className="bg-surface-container p-2 border border-outline/40">
                              <span className="text-neutral-500 block text-[9px] uppercase">Dropped (Queue Limit)</span>
                              <span className="text-red-400 text-[13px] font-bold">{diagnostics.droppedCount}</span>
                            </div>
                          </div>

                          <div className="bg-surface-container p-2 border border-outline/40 font-mono text-[10px] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-neutral-500 uppercase">Last Flush UTC:</span>
                              <span className="text-neutral-300 truncate max-w-[200px]">
                                {diagnostics.lastFlushTimeUtc || 'Never'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-500 uppercase">Last Error:</span>
                              <span className={`truncate max-w-[200px] ${diagnostics.lastError ? 'text-red-400' : 'text-neutral-400'}`}>
                                {diagnostics.lastError || 'None'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await flushQueue();
                                showToast('ANALYTICS QUEUE FLUSH TRIGGERED', 'primary');
                              }}
                              className="flex-1 bg-purple-900/60 hover:bg-purple-800 text-white border border-purple-600 py-1.5 px-2 font-label-xl text-[11px] uppercase text-center cursor-pointer transition-colors"
                            >
                              FLUSH QUEUE NOW
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                refreshDiagnostics();
                                showToast('DIAGNOSTICS REFRESHED', 'secondary');
                              }}
                              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-outline py-1.5 px-2.5 font-label-xl text-[11px] uppercase cursor-pointer flex items-center gap-1"
                            >
                              <RefreshCw size={12} />
                              <span>REFRESH</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Legal, DOB & About */}
                  <div className="border-t border-outline/40 pt-2 flex flex-col gap-2">
                    {/* DOB Card */}
                    <div className="bg-surface-container-low border-[2px] border-outline p-2.5 flex items-center justify-between shadow-[2px_2px_0_#000]">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#f4c300]/20 border border-[#f4c300] p-1 text-[#f4c300]">
                          <Calendar size={16} />
                        </div>
                        <div>
                          <span className="font-label-xl text-[12px] text-white uppercase block font-bold">
                            AGE VERIFICATION (DOB)
                          </span>
                          <span className="font-sans text-[10px] text-neutral-400 block">
                            {userDob ? `Verified (${userDob}) • Locked` : 'Verified (18+) • Single-entry locked'}
                          </span>
                        </div>
                      </div>
                      <span className="font-label-md text-[9px] bg-[#152000] text-[#ceff8c] border border-[#7abb00] px-1.5 py-0.5 uppercase font-bold">
                        LOCKED ✓
                      </span>
                    </div>

                    {/* Privacy Policy */}
                    <a
                      href="https://memecapsule.wtf/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-surface-container-low hover:bg-surface-container-high border-[2px] border-outline p-2.5 flex items-center justify-between shadow-[2px_2px_0_#000] transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="bg-primary/20 border border-primary p-1 text-primary">
                          <Shield size={16} />
                        </div>
                        <div>
                          <span className="font-label-xl text-[13px] text-white uppercase block font-bold">
                            PRIVACY POLICY & TERMS
                          </span>
                          <span className="font-sans text-[11px] text-neutral-400 block">
                            memecapsule.wtf/privacy
                          </span>
                        </div>
                      </div>
                      <ExternalLink size={15} className="text-secondary-container shrink-0" />
                    </a>

                    <div className="flex items-center justify-between px-1 text-[10px] font-label-md text-outline uppercase">
                      <span>MEME CAPSULE v3.8 (BUILD 30)</span>
                      <span>ANTI-ALGORITHM ENTERTAINMENT</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-[1020] flex justify-around items-center h-[calc(60px+max(env(safe-area-inset-bottom,0px),16px))] px-sm pt-2 pb-[max(env(safe-area-inset-bottom,0px),16px)] bg-surface-container-highest border-t-[3px] border-outline md:max-w-[500px] md:left-1/2 md:-translate-x-1/2 md:border-x-[3px] shadow-[0px_-4px_16px_0px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false);
            if (activeTab === 'home') {
              if (meme) {
                // Keep the current meme right at the front of memeQueue so tapping DROP ME A MEME restores it immediately without re-downloading
                setMemeQueue((prev) => [meme, ...prev.filter((m) => m.url !== meme.url)].slice(0, PIPELINE_TARGET_SIZE));
              }
              sessionStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
              localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
              localStorage.removeItem(SHARE_HANDOFF_STORAGE_KEY);
              setScreen('waiting');
              setMeme(null);
            } else {
              setActiveTab('home');
            }
          }}
          className={`rounded-none h-[46px] px-5 sm:px-7 border-[2px] border-background flex items-center justify-center transition-all duration-100 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
            activeTab === 'home'
              ? 'bg-primary text-on-primary shadow-[3px_3px_0px_0px_var(--color-secondary-container)]'
              : 'bg-[#222121] text-outline border-outline/30 hover:bg-secondary-container hover:text-[#000]'
          }`}
          style={{ touchAction: 'manipulation' }}
          title="Home"
        >
          <Home size={22} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false);
            setActiveTab('favorites');
          }}
          className={`rounded-none h-[46px] px-5 sm:px-7 border-[2px] border-background flex items-center justify-center transition-all duration-100 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
            activeTab === 'favorites'
              ? 'bg-primary text-on-primary shadow-[3px_3px_0px_0px_var(--color-secondary-container)]'
              : 'bg-[#222121] text-outline border-outline/30 hover:bg-secondary-container hover:text-[#000]'
          }`}
          style={{ touchAction: 'manipulation' }}
          title="Vault / Favorites"
        >
          <Bookmark size={22} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false);
            setActiveTab('boards');
          }}
          className={`rounded-none h-[46px] px-5 sm:px-7 border-[2px] border-background flex items-center justify-center transition-all duration-100 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
            activeTab === 'boards'
              ? 'bg-primary text-on-primary shadow-[3px_3px_0px_0px_var(--color-secondary-container)]'
              : 'bg-[#222121] text-outline border-outline/30 hover:bg-secondary-container hover:text-[#000]'
          }`}
          style={{ touchAction: 'manipulation' }}
          title="Moodboards"
        >
          <LayoutGrid size={21} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false);
            setActiveTab('settings');
          }}
          className={`rounded-none h-[46px] px-5 sm:px-7 border-[2px] border-background flex items-center justify-center transition-all duration-100 cursor-pointer active:translate-x-0.5 active:translate-y-0.5 ${
            activeTab === 'settings'
              ? 'bg-primary text-on-primary shadow-[3px_3px_0px_0px_var(--color-secondary-container)]'
              : 'bg-[#222121] text-outline border-outline/30 hover:bg-secondary-container hover:text-[#000]'
          }`}
          style={{ touchAction: 'manipulation' }}
          title="Settings"
        >
          <Settings size={21} strokeWidth={2.5} />
        </button>
      </nav>
    </div>
  );
}
