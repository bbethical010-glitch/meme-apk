import { AdMob, BannerAdPosition, BannerAdSize, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { AD_TEST_MODE, AD_UNITS } from './adsConfig';
import { acquireFullscreenAd, initializeAds, releaseFullscreenAd } from './adRuntime';
import { isInAdFreeWindow } from './rewards';
import { hasRemovedAds } from './entitlements';

export async function areAutomaticAdsSuppressed(): Promise<boolean> {
  try { return (await hasRemovedAds()) || isInAdFreeWindow(); }
  catch { return true; } // Ownership unavailable: defer automatic ads until reconciled.
}

let lastInterstitialTime = 0;
export const INTERSTITIAL_COOLDOWN_MS = 30_000;

export function resetInterstitialCooldownForTesting(): void {
  lastInterstitialTime = 0;
}

export async function maybeShowInterstitial(triggerCount?: number): Promise<void> {
  if (triggerCount !== undefined && triggerCount % 4 !== 0) return;
  if (!acquireFullscreenAd()) return;
  const listeners: PluginListenerHandle[] = [];
  try {
    if (await areAutomaticAdsSuppressed()) return;
    await initializeAds();
    await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: AD_TEST_MODE, npa: true });
    if (await areAutomaticAdsSuppressed()) return;
    let finish!: () => void;
    const dismissed = new Promise<void>(resolve => { finish = resolve; });
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish));
    listeners.push(await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish));
    await AdMob.showInterstitial();
    lastInterstitialTime = Date.now();
    await dismissed;
  } catch {
    // No-fill/offline ads must never block navigation or drops.
  } finally {
    await Promise.allSettled(listeners.map(listener => listener.remove()));
    releaseFullscreenAd();
  }
}

export async function maybeShowScreenTransitionInterstitial(fromScreen?: string, toScreen?: string): Promise<void> {
  if (fromScreen && toScreen && fromScreen === toScreen) return;
  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) return;
  await maybeShowInterstitial();
}

let bannerQueue: Promise<void> = Promise.resolve();
let bannerVisible = false;
export function setBannerVisible(visible: boolean): Promise<void> {
  bannerQueue = bannerQueue.catch(() => undefined).then(async () => {
    if (!AD_UNITS.banner) return;
    const allowed = visible && !(await areAutomaticAdsSuppressed());
    if (!allowed) {
      if (bannerVisible) await AdMob.removeBanner();
      bannerVisible = false;
      return;
    }
    if (bannerVisible) return;
    await initializeAds();
    if (await areAutomaticAdsSuppressed()) return;
    await AdMob.showBanner({ adId: AD_UNITS.banner, adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER, margin: 110, isTesting: AD_TEST_MODE, npa: true });
    bannerVisible = true;
    if (await areAutomaticAdsSuppressed()) { await AdMob.removeBanner(); bannerVisible = false; }
  });
  return bannerQueue;
}
