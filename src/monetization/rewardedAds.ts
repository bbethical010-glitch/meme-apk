import { AdMob, RewardAdPluginEvents, type RewardAdOptions } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { AD_TEST_MODE, AD_UNITS } from './adsConfig';
import { acquireFullscreenAd, initializeAds, releaseFullscreenAd } from './adRuntime';
import { hasRemovedAds } from './entitlements';

let ready = false;

export async function loadRewardedAd(adUnitId: string): Promise<void> {
  ready = false;
  if (!adUnitId) throw new Error('Configure VITE_ADMOB_REWARDED_ID');
  await initializeAds();
  const options: RewardAdOptions = { adId: adUnitId, isTesting: AD_TEST_MODE, npa: true };
  await AdMob.prepareRewardVideoAd(options);
  ready = true;
}

// Android's show promise only resolves on reward, and can stay pending on early
// dismissal. Observe dismissal/failure too; never grant on mere ad presentation.
export async function showRewardedAd(): Promise<{ rewarded: boolean }> {
  if (!acquireFullscreenAd()) return { rewarded: false };
  const listeners: PluginListenerHandle[] = [];
  try {
    if (await hasRemovedAds()) return { rewarded: true };
    if (!ready) await loadRewardedAd(AD_UNITS.rewarded);
    if (await hasRemovedAds()) return { rewarded: true };
    ready = false;
    let earned = false;
    let finish!: (value: { rewarded: boolean }) => void;
    const dismissed = new Promise<{ rewarded: boolean }>(resolve => { finish = resolve; });
    listeners.push(await AdMob.addListener(RewardAdPluginEvents.Rewarded, reward => {
      earned = Number(reward.amount) > 0;
    }));
    listeners.push(await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish({ rewarded: earned })));
    listeners.push(await AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish({ rewarded: false })));
    void AdMob.showRewardVideoAd().then(reward => {
      earned = Number(reward?.amount) > 0;
    }).catch(() => finish({ rewarded: false }));
    return await dismissed;
  } catch {
    return { rewarded: false };
  } finally {
    await Promise.allSettled(listeners.map(listener => listener.remove()));
    releaseFullscreenAd();
  }
}
