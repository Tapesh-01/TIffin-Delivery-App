import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { LoginScreen } from '../components/screens/LoginScreen';
import { HomeScreen } from '../components/screens/HomeScreen';
import { api } from '../lib/api';
import { socket } from '../lib/socket';

export const AppNavigator: React.FC = () => {
  const [rider, setRider] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Auto-restore rider session on app open
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('@tiffin_token');
      if (token) {
        const { data } = await api.get('/auth/profile');
        if (data.success && data.user.role === 'rider') {
          setRider(data.user);
          setupSocket(data.user.id);
        } else {
          await AsyncStorage.removeItem('@tiffin_token');
        }
      }
    } catch (e) {
      console.log('No valid session found');
      await AsyncStorage.removeItem('@tiffin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocket = (userId: string) => {
    socket.connect();
    socket.emit('join', { userId, role: 'rider' });
  };

  const handleLogin = async (riderData: any, token: string) => {
    await AsyncStorage.setItem('@tiffin_token', token);
    setRider(riderData);
    setupSocket(riderData.id);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('@tiffin_token');
    socket.disconnect();
    setRider(null);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!rider) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <HomeScreen rider={rider} onLogout={handleLogout} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
