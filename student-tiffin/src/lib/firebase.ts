import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  RecaptchaVerifier
} from 'firebase/auth';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let firebaseApp;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }

    auth = getAuth(firebaseApp);

    console.log('🔌 [Firebase] Configured and connected successfully!');
  } catch (error) {
    console.error('❌ [Firebase] Initialization failed:', error);
  }
} else {
  console.log('⚠️ [Firebase] Credentials missing. Student App running in Phone Sandbox Mode.');
}

// Invisible reCAPTCHA verifier for Web platform
export const createRecaptchaVerifier = (authInstance: Auth, containerId: string) => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  // Ensure DOM element is empty to prevent multiple widget initialization errors
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  try {
    return new RecaptchaVerifier(authInstance, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved successfully
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired. Resetting verifier...');
      }
    });
  } catch (error) {
    console.error('Failed to instantiate RecaptchaVerifier:', error);
    return null;
  }
};

export { auth };
