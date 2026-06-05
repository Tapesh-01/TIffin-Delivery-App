import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const getSocketUrl = () => {
  if (process.env.EXPO_PUBLIC_SOCKET_URL) {
    return process.env.EXPO_PUBLIC_SOCKET_URL;
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }
  return 'http://localhost:5000';
};

export const socket = io(getSocketUrl(), {
  autoConnect: false // We will connect manually after login
});
