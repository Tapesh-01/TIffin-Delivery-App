import 'react-native-url-polyfill/auto';
import React, { useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';
import { StatusBar } from 'expo-status-bar';
import { SplashScreen } from './src/components/screens/SplashScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Colors } from './src/constants/colors';

// Global Alert.alert polyfill for Web platform
if (Platform.OS === 'web') {
  (Alert as any).alert = (title: string, message?: string, buttons?: any[]) => {
    const text = `${title}${message ? '\n\n' + message : ''}`;
    if (buttons && buttons.length > 0) {
      const hasCancel = buttons.some(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
      if (hasCancel) {
        const proceed = window.confirm(text);
        if (proceed) {
          const actionBtn = buttons.find(b => b.text?.toLowerCase() !== 'cancel');
          if (actionBtn && actionBtn.onPress) {
            actionBtn.onPress();
          }
        } else {
          const cancelBtn = buttons.find(b => b.text?.toLowerCase() === 'cancel');
          if (cancelBtn && cancelBtn.onPress) {
            cancelBtn.onPress();
          }
        }
      } else {
        window.alert(text);
        if (buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }
    } else {
      window.alert(text);
    }
  };
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  if (showSplash) {
    return (
      <View style={styles.webWrapper}>
        <View style={styles.mobileFrame}>
          <SplashScreen onFinish={() => setShowSplash(false)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.webWrapper}>
      <StatusBar style="dark" />
      <View style={styles.mobileFrame}>
        <AppNavigator />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    // On web, show dark background around mobile frame
    ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
  },
  mobileFrame: {
    width: Platform.OS === 'web' ? 390 : '100%',
    flex: Platform.OS === 'web' ? undefined : 1,
    height: Platform.OS === 'web' ? 844 : undefined,
    maxHeight: Platform.OS === 'web' ? '100vh' as any : undefined,
    overflow: Platform.OS === 'web' ? 'hidden' as any : undefined,
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    backgroundColor: Colors.background,
    // Shadow around the phone frame on web
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 8px rgba(255,255,255,0.05)' as any,
    } : {}),
  },
});
