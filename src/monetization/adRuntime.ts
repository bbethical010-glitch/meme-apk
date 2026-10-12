import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { AD_TEST_MODE } from './adsConfig';

let initialization: Promise<void> | undefined;
let fullscreenBusy = false;

export async function initializeAds(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') throw new Error('Ads require Android');
  initialization ??= AdMob.initialize({ initializeForTesting: AD_TEST_MODE }).catch(error => {
    initialization = undefined;
    throw error;
  });
  await initialization;
}

export function acquireFullscreenAd(): boolean {
  if (fullscreenBusy) return false;
  fullscreenBusy = true;
  return true;
}

export function releaseFullscreenAd(): void {
  fullscreenBusy = false;
}
