import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const getSocketUrl = () => {
  if (Platform.OS === 'web') {
    return 'https://apsara-ice-cream-cj1s.onrender.com';
  }
  return 'http://192.168.1.4:8000';
};

const socket = io(getSocketUrl(), {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const connectOrderSocket = (orderId, callback) => {
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', orderId);
  if (callback) {
    socket.on('status_update', callback);
  }
};

export const leaveOrderSocket = (orderId, callback) => {
  socket.emit('leave_order', orderId);
  if (callback) {
    socket.off('status_update', callback);
  }
};

export default socket;
