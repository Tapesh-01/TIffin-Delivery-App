import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Configure notification behavior for when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions and register for Expo Push Notifications.
 * Returns the push token string, or null if on Web, simulator, or denied.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    // Web Fallback: Request HTML5 Web Notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        console.log(`🌐 HTML5 Web Notification permission: ${permission}`);
      } catch (err) {
        console.error('Failed to request HTML5 Notification permission:', err);
      }
    }
    return null;
  }

  if (!Device.isDevice) {
    console.log('📱 Push Notifications: Skipping registration on iOS/Android Simulator');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Notification permissions were not granted!');
      return null;
    }

    // Retrieve Expo Push Token
    // Note: Expo Go uses the default projectId if not explicitly configured in app.json
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log(`🔔 Expo Push Token registered successfully: ${token}`);

    // Set channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF4500',
      });
    }

    return token;
  } catch (error) {
    console.warn('❌ Failed to register for Expo Push Notifications:', error);
    return null;
  }
}

/**
 * Display a local HTML5 browser notification if running on Web.
 */
export function showWebNotification(title: string, body: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.png' // Fallback to app favicon if available
        });
      } catch (err) {
        console.error('Error displaying HTML5 notification:', err);
      }
    }
  }
}
