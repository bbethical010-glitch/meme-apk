import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';

const NOTIFICATION_REGISTER_ENDPOINT = 'https://meme-capsule-eww.pages.dev/api/notifications/register';
const APP_VERSION = '3.8';

export interface PushNotificationData {
  screen?: 'home' | 'drop' | 'favorites' | 'boards' | 'settings' | 'store' | 'pro' | 'premium' | string;
  action?: 'drop' | 'refresh' | string;
  meme_id?: string;
  capsule_id?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Sends registered FCM device token to Cloudflare Pages D1 backend.
 * Uses CapacitorHttp on native Android to bypass WebView CORS restrictions.
 */
async function syncTokenWithBackend(token: string) {
  try {
    const payload = {
      token,
      platform: 'android',
      app_version: APP_VERSION,
    };

    let status = 0;
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.post({
        url: NOTIFICATION_REGISTER_ENDPOINT,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        data: payload,
      });
      status = res.status;
    } else {
      const res = await fetch(NOTIFICATION_REGISTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      status = res.status;
    }

    if (status >= 200 && status < 300) {
      console.log('[FCM] Token synced with Cloudflare backend successfully.');
      localStorage.setItem('fcm_token_synced', 'true');
    } else {
      console.warn('[FCM] Backend token registration responded with status:', status);
    }
  } catch (err) {
    console.error('[FCM] Failed to sync token with backend:', err);
  }
}

/**
 * Initializes Firebase Push Notifications on Capacitor Android.
 */
export async function initPushNotifications(
  onNotificationAction?: (data: PushNotificationData) => void,
  onNotificationReceived?: (notification: PushNotificationSchema) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM] Push notifications disabled on non-native web preview.');
    return;
  }

  try {
    // 1. Check or request permissions (required for Android 13+ POST_NOTIFICATIONS)
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive !== 'granted') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FCM] Push notification permission not granted:', permStatus.receive);
      return;
    }

    // 2. Create high-importance notification channel for Android 8+
    try {
      await PushNotifications.createChannel({
        id: 'meme_capsule_drops',
        name: 'Meme Capsule Drops',
        description: 'Daily drops and fresh comedy releases',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    } catch (channelErr) {
      console.warn('[FCM] Could not create notification channel:', channelErr);
    }

    // 3. Remove any previous listeners to avoid duplicates on re-renders
    await PushNotifications.removeAllListeners();

    // 4. Register device token listener
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[FCM] Device registered. Token:', token.value);
      localStorage.setItem('fcm_device_token', token.value);
      await syncTokenWithBackend(token.value);
    });

    // 5. Registration error listener
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Registration error:', JSON.stringify(error));
    });

    // 6. Foreground notification received listener
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[FCM] Notification received in foreground:', notification.title, notification.body);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
        window.dispatchEvent(
          new CustomEvent('meme_capsule_push_received', { detail: notification })
        );
      }
    );

    // 7. Action performed (user tapped notification in system tray)
    await PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('[FCM] Notification action performed:', action.notification.data);
        const data = (action.notification.data || {}) as PushNotificationData;
        if (onNotificationAction) {
          onNotificationAction(data);
        }
        // Dispatch window event for global routing
        window.dispatchEvent(
          new CustomEvent('meme_capsule_push_action', { detail: data })
        );
      }
    );

    // 8. Trigger native FCM registration
    await PushNotifications.register();
    console.log('[FCM] Registration request sent to native system.');

    // 9. If a token is already cached in localStorage, ensure backend sync is up to date
    const cachedToken = localStorage.getItem('fcm_device_token');
    if (cachedToken) {
      console.log('[FCM] Proactively syncing cached device token to backend...');
      void syncTokenWithBackend(cachedToken);
    }
  } catch (err) {
    console.error('[FCM] Initialization error:', err);
  }
}
