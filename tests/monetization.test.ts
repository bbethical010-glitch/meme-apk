import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  platform: 'android',
  supported: vi.fn(), products: vi.fn(), purchases: vi.fn(), buy: vi.fn(), acknowledge: vi.fn(),
  initialize: vi.fn(), prepareReward: vi.fn(), showReward: vi.fn(), prepareInterstitial: vi.fn(), showInterstitial: vi.fn(),
  showBanner: vi.fn(), removeBanner: vi.fn(), listeners: new Map<string, (payload?: unknown) => void>(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => native.platform, isNativePlatform: () => native.platform === 'android' },
  CapacitorHttp: { get: vi.fn() },
}));
vi.mock('@capgo/native-purchases', () => ({
  PURCHASE_TYPE: { INAPP: 'inapp' },
  NativePurchases: { isBillingSupported: native.supported, getProducts: native.products, getPurchases: native.purchases,
    purchaseProduct: native.buy, acknowledgePurchase: native.acknowledge },
}));
vi.mock('@capacitor-community/admob', () => ({
  RewardAdPluginEvents: { Rewarded: 'rewarded', Dismissed: 'dismissed', FailedToShow: 'failed' },
  InterstitialAdPluginEvents: { Dismissed: 'interstitial-dismissed', FailedToShow: 'interstitial-failed' },
  BannerAdPosition: { BOTTOM_CENTER: 'bottom' }, BannerAdSize: { BANNER: 'banner' },
  AdMob: { initialize: native.initialize, prepareRewardVideoAd: native.prepareReward, showRewardVideoAd: native.showReward,
    prepareInterstitial: native.prepareInterstitial, showInterstitial: native.showInterstitial,
    showBanner: native.showBanner, removeBanner: native.removeBanner,
    addListener: vi.fn(async (event, handler) => {
      native.listeners.set(event, handler);
      return { remove: async () => { native.listeners.delete(event); } };
    }),
  },
}));

const completed = (productIdentifier: string, overrides = {}) => ({
  productIdentifier, productType: 'inapp', purchaseState: '1', isAcknowledged: true,
  purchaseToken: 'test-token', transactionId: 'test-order', purchaseDate: '2026-10-04T00:00:00Z', willCancel: null, ...overrides,
});

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); native.listeners.clear(); native.platform = 'android';
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, String(value)), removeItem: (key: string) => data.delete(key), clear: () => data.clear() });
  vi.stubGlobal('window', new EventTarget());
  vi.stubEnv('VITE_ADMOB_BANNER_ID', 'configured-banner');
  native.supported.mockResolvedValue({ isBillingSupported: true });
  native.products.mockResolvedValue({ products: [{ identifier: 'remove_ads_forever', priceString: '$1.99' }] });
  native.purchases.mockResolvedValue({ purchases: [] }); native.acknowledge.mockResolvedValue(undefined);
  native.initialize.mockResolvedValue(undefined); native.prepareReward.mockResolvedValue(undefined);
  native.prepareInterstitial.mockResolvedValue(undefined); native.showInterstitial.mockResolvedValue(undefined);
  native.showBanner.mockResolvedValue(undefined); native.removeBanner.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('reward lifetimes', () => {
  it('requests the unlocked themed subset and filters unsafe and locally blocked memes', async () => {
    native.platform = 'web';
    const rewards = await import('../src/monetization/rewards');
    const { fetchPackMeme } = await import('../src/monetization/packs');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(fetchPackMeme('programming')).rejects.toThrow('locked');
    expect(fetcher).not.toHaveBeenCalled();
    rewards.grantThemedPack('programming');
    localStorage.setItem('reported_memes', JSON.stringify(['https://example.test/blocked.png']));
    const payload = { subreddit: 'ProgrammerHumor', url: 'https://example.test/safe.png', title: 'Safe meme' };
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, nsfw: true }) });
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, url: 'https://example.test/blocked.png' }) });
    fetcher.mockResolvedValueOnce({ ok: true, json: async () => payload });
    expect((await fetchPackMeme('programming')).title).toBe('Safe meme');
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher).toHaveBeenLastCalledWith('https://meme-api.com/gimme/ProgrammerHumor', expect.anything());
  });
  it('rejects a pack response when access expires during the request', async () => {
    native.platform = 'web';
    const rewards = await import('../src/monetization/rewards');
    rewards.grantThemedPack('wholesome');
    vi.stubGlobal('fetch', vi.fn(async () => {
      localStorage.removeItem('meme_capsule_pack_wholesome_until');
      return { ok: true, json: async () => ({ subreddit: 'wholesomememes', url: 'https://example.test/meme.png' }) };
    }));
    const { fetchPackMeme } = await import('../src/monetization/packs');
    await expect(fetchPackMeme('wholesome')).rejects.toThrow('expired');
  });
  it('expires ad-free at 30 minutes and pack access at 24 hours', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
    const rewards = await import('../src/monetization/rewards');
    rewards.grantAdFreeWindow(); rewards.grantThemedPack('programming');
    vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    expect(rewards.isInAdFreeWindow()).toBe(true);
    vi.advanceTimersByTime(1); expect(rewards.isInAdFreeWindow()).toBe(false);
    expect(rewards.isPackUnlocked('programming')).toBe(true);
    vi.advanceTimersByTime(23.5 * 60 * 60 * 1000);
    expect(rewards.isPackUnlocked('programming')).toBe(false);
  });
  it('grants one slot, resets on cold start, and keeps saved boards intact', async () => {
    localStorage.setItem('meme_mood_boards', '[{"id":"existing"}]');
    const rewards = await import('../src/monetization/rewards');
    rewards.startRewardSession(); expect(rewards.canCreateBoard(3)).toBe(false);
    rewards.grantBonusBoard(); expect(rewards.canCreateBoard(3)).toBe(true);
    expect(rewards.canCreateBoard(4)).toBe(false);
    rewards.startRewardSession(); expect(rewards.getBonusBoards()).toBe(1); // StrictMode remount
    vi.resetModules();
    const nextSession = await import('../src/monetization/rewards');
    nextSession.startRewardSession(); expect(nextSession.getBonusBoards()).toBe(0);
    expect(localStorage.getItem('meme_mood_boards')).toBe('[{"id":"existing"}]');
    expect(nextSession.canCreateBoard(100, true)).toBe(true);
  });
});

describe('Play ownership and purchases', () => {
  it('maps the bundle to every individual SKU and rejects pending/unknown transactions', async () => {
    const e = await import('../src/monetization/entitlements');
    const { PRODUCTS, PRODUCT_IDS } = await import('../src/monetization/products');
    native.purchases.mockResolvedValue({ purchases: [completed(PRODUCTS.PRO_BUNDLE)] });
    const result = await e.getEntitlements();
    expect(result.adsRemoved).toBe(true); expect(result.unlimitedBoards).toBe(true);
    expect(result.ownedThemes).toEqual([PRODUCTS.THEME_CYBERPUNK, PRODUCTS.THEME_ACID, PRODUCTS.THEME_MIDNIGHT_GOLD, PRODUCTS.THEME_BLOOD_ORANGE]);
    const { CATALOG_BY_ID } = await import('../src/monetization/catalog');
    for (const id of CATALOG_BY_ID[PRODUCTS.PRO_BUNDLE].includes) expect(e.ownsProduct(result, id)).toBe(true);
    expect(e.ownedProductIds([completed(PRODUCTS.PRO_BUNDLE, { purchaseState: '2' }), completed('unknown')])).toEqual([]);
  });
  it('deduplicates queries, caches for one hour, then reconciles refunds', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-04T00:00:00Z'));
    const e = await import('../src/monetization/entitlements');
    native.purchases.mockResolvedValue({ purchases: [completed('remove_ads_forever')] });
    await Promise.all([e.getEntitlements(), e.getEntitlements(), e.hasRemovedAds()]);
    expect(native.purchases).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(e.ENTITLEMENT_TTL - 1); expect(await e.hasRemovedAds()).toBe(true);
    expect(native.purchases).toHaveBeenCalledTimes(1);
    native.purchases.mockResolvedValue({ purchases: [] }); vi.advanceTimersByTime(1);
    expect(await e.hasRemovedAds()).toBe(false);
    expect(native.purchases).toHaveBeenCalledTimes(2);
  });
  it('purchases non-consumables, acknowledges and immediately publishes ownership', async () => {
    const e = await import('../src/monetization/entitlements');
    const { purchaseProduct } = await import('../src/monetization/purchases');
    native.buy.mockImplementation(async () => {
      native.purchases.mockResolvedValue({ purchases: [completed('remove_ads_forever')] });
      return completed('remove_ads_forever', { isAcknowledged: false });
    });
    expect(await purchaseProduct('remove_ads_forever')).toBe(true);
    expect(native.buy).toHaveBeenCalledWith(expect.objectContaining({ isConsumable: false, autoAcknowledgePurchases: false, productType: 'inapp' }));
    expect(native.acknowledge).toHaveBeenCalledWith({ purchaseToken: 'test-token' });
    expect(e.getEntitlementsSnapshot().adsRemoved).toBe(true);
    expect(e.getEntitlementsSnapshot().unlimitedBoards).toBe(false);
    expect(await purchaseProduct('remove_ads_forever')).toBe(true);
    expect(native.buy).toHaveBeenCalledTimes(1);
  });
  it('cancel, pending, unsupported billing and web never grant or show an error toast', async () => {
    const toast = vi.fn(); window.addEventListener('meme-capsule-monetization-toast', toast);
    const { purchaseProduct } = await import('../src/monetization/purchases');
    const e = await import('../src/monetization/entitlements');
    native.buy.mockRejectedValue({ code: 'USER_CANCELED' });
    expect(await purchaseProduct('remove_ads_forever')).toBe(false);
    native.buy.mockResolvedValue(completed('remove_ads_forever', { purchaseState: '2', isAcknowledged: false }));
    expect(await purchaseProduct('remove_ads_forever')).toBe(false);
    expect(native.acknowledge).not.toHaveBeenCalled();
    native.supported.mockResolvedValue({ isBillingSupported: false });
    expect(await purchaseProduct('remove_ads_forever')).toBe(false);
    native.platform = 'web'; expect(await purchaseProduct('remove_ads_forever')).toBe(false);
    expect(e.getEntitlementsSnapshot().adsRemoved).toBe(false); expect(toast).not.toHaveBeenCalled();
  });
  it('restores after cleared app data by querying Play, not a void restore return', async () => {
    const toast = vi.fn(); window.addEventListener('meme-capsule-monetization-toast', toast);
    native.purchases.mockResolvedValue({ purchases: [completed('meme_capsule_pro', { isAcknowledged: false })] });
    localStorage.clear();
    const { restorePurchases } = await import('../src/monetization/purchases');
    const e = await import('../src/monetization/entitlements');
    await restorePurchases();
    expect(e.getEntitlementsSnapshot().unlimitedBoards).toBe(true);
    expect(native.purchases).toHaveBeenCalledWith({ productType: 'inapp' });
    expect(native.acknowledge).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0].detail).toMatch(/purchases restored/i);
    native.purchases.mockResolvedValue({ purchases: [] }); await restorePurchases();
    expect(toast.mock.calls[1][0].detail).toMatch(/no purchases found|nothing to restore/i);
    expect(e.getEntitlementsSnapshot().adsRemoved).toBe(false);
  });
  it('does not trust the legacy browser-granted is_pro flag or corrupt cache', async () => {
    localStorage.setItem('is_pro', 'true'); localStorage.setItem('meme_capsule_entitlements_v1', '{');
    const e = await import('../src/monetization/entitlements');
    expect((await e.getEntitlements()).adsRemoved).toBe(false);
  });
});

describe('native ad boundaries', () => {
  it('uses Google test rewarded video, grants only earned reward, and waits for dismissal', async () => {
    let earn!: (value: unknown) => void;
    native.showReward.mockImplementation(() => new Promise(resolve => { earn = resolve; }));
    const { showRewardedAd } = await import('../src/monetization/rewardedAds');
    const result = showRewardedAd();
    await vi.waitFor(() => expect(native.showReward).toHaveBeenCalled());
    expect(native.prepareReward).toHaveBeenCalledWith(expect.objectContaining({ adId: 'ca-app-pub-3940256099942544/5224354917', isTesting: true }));
    native.listeners.get('rewarded')?.({ amount: 1 }); earn({ amount: 1 });
    native.listeners.get('dismissed')?.();
    expect(await result).toEqual({ rewarded: true }); expect(native.listeners.size).toBe(0);
  });
  it('handles early close and prevents two simultaneous opt-in shows', async () => {
    native.showReward.mockImplementation(() => new Promise(() => undefined));
    const { showRewardedAd } = await import('../src/monetization/rewardedAds');
    const first = showRewardedAd();
    await vi.waitFor(() => expect(native.showReward).toHaveBeenCalled());
    expect(await showRewardedAd()).toEqual({ rewarded: false });
    native.listeners.get('dismissed')?.();
    expect(await first).toEqual({ rewarded: false }); expect(native.listeners.size).toBe(0);
  });
  it('handles no-fill without reward and lets a later attempt retry', async () => {
    native.prepareReward.mockRejectedValueOnce(new Error('no fill'));
    const { showRewardedAd } = await import('../src/monetization/rewardedAds');
    expect(await showRewardedAd()).toEqual({ rewarded: false });
    expect(native.showReward).not.toHaveBeenCalled();
    native.showReward.mockRejectedValueOnce(new Error('show failed'));
    expect(await showRewardedAd()).toEqual({ rewarded: false });
  });
  it('interstitial and banner both suppress for paid and time-boxed ad-free ownership', async () => {
    native.purchases.mockResolvedValue({ purchases: [completed('meme_capsule_pro')] });
    const ads = await import('../src/monetization/ads');
    await ads.maybeShowInterstitial(4); await ads.setBannerVisible(true);
    expect(native.prepareInterstitial).not.toHaveBeenCalled(); expect(native.showBanner).not.toHaveBeenCalled();
    native.purchases.mockResolvedValue({ purchases: [] });
    const e = await import('../src/monetization/entitlements'); await e.getEntitlements(true);
    const rewards = await import('../src/monetization/rewards'); rewards.grantAdFreeWindow();
    await ads.maybeShowInterstitial(8); await ads.setBannerVisible(true);
    expect(native.prepareInterstitial).not.toHaveBeenCalled(); expect(native.showBanner).not.toHaveBeenCalled();
    localStorage.removeItem('meme_capsule_adfree_until');
    const interstitial = ads.maybeShowInterstitial(12);
    await vi.waitFor(() => expect(native.showInterstitial).toHaveBeenCalledTimes(1));
    native.listeners.get('interstitial-dismissed')?.(); await interstitial;
    await ads.setBannerVisible(true); expect(native.showBanner).toHaveBeenCalledTimes(1);
    rewards.grantAdFreeWindow(); await ads.setBannerVisible(true); expect(native.removeBanner).toHaveBeenCalledTimes(1);
  });
  it('suppresses automatic ads when ownership cannot be checked', async () => {
    native.purchases.mockRejectedValue(new Error('offline'));
    const ads = await import('../src/monetization/ads');
    await ads.maybeShowInterstitial(4); await ads.setBannerVisible(true);
    expect(native.initialize).not.toHaveBeenCalled();
  });
});
