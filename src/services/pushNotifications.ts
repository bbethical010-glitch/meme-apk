import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from '@capacitor/push-notifications';

const NOTIFICATION_REGISTER_ENDPOINT = 'https://meme-capsule-eww.pages.dev/api/notifications/register';
const APP_VERSION = '3.8';

export interface PushNotificationData {
  screen?: string;
  meme_id?: string;
  capsule_id?: string;
  [key: string]: any;
}

/**
 * Sends registered FCM device token to Cloudflare Pages D1 backend.
 */
async function syncTokenWithBackend(token: string) {
  try {
    const res = await fetch(NOTIFICATION_REGISTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform: 'android',
        app_version: APP_VERSION,
      }),
    });

    if (res.ok) {
      console.log('[FCM] Token synced with Cloudflare backend successfully.');
      localStorage.setItem('fcm_token_synced', 'true');
    } else {
      console.warn('[FCM] Backend token registration responded with status:', res.status);
    }
  } catch (err) {
    console.error('[FCM] Failed to sync token with backend:', err);
  }
}

/**
 * Initializes Firebase Push Notifications on Capacitor Android.
 */
export async function initPushNotifications(
  onNotificationAction?: (data: PushNotificationData) => void
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[FCM] Push notifications disabled on non-native web preview.');
    return;
  }

  try {
    // 1. Check or request permissions (required for Android 13+ POST_NOTIFICATIONS)
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[FCM] Push notification permission not granted:', permStatus.receive);
      return;
    }

    // 2. Remove any previous listeners to avoid duplicates on re-renders
    await PushNotifications.removeAllListeners();

    // 3. Register device token listener
    await PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[FCM] Device registered. Token:', token.value);
      localStorage.setItem('fcm_device_token', token.value);
      await syncTokenWithBackend(token.value);
    });

    // 4. Registration error listener
    await PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[FCM] Registration error:', JSON.stringify(error));
    });

    // 5. Foreground notification received listener
    await PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('[FCM] Notification received in foreground:', notification.title, notification.body);
      }
    );

    // 6. Action performed (user tapped notification in system tray)
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

    // 7. Trigger native FCM registration
    await PushNotifications.register();
    console.log('[FCM] Registration request sent to native system.');
  } catch (err) {
    console.error('[FCM] Initialization error:', err);
  }
}
