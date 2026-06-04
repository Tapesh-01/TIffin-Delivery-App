import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(socketUrl, {
  autoConnect: false // We will connect manually after login
});
