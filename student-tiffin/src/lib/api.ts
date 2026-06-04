import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use appropriate localhost based on environment
// For Android Emulator, localhost is 10.0.2.2. For iOS/Web, it's localhost or 127.0.0.1.
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to inject the authorization token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@tiffin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Intercept responses to handle authentication failures (e.g. database resets, expired tokens)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('🔒 Session expired or unauthorized. Clearing token.');
      await AsyncStorage.removeItem('@tiffin_token');
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Force redirect to login page to reset navigation and user states
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
