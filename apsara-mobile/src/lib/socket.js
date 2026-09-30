import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const getSocketUrl = () => {
  return 'https://apsara-ice-cream-cj1s.onrender.com';
};

const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity,
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

export const connectRiderTracking = (orderId, callback) => {
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', orderId);
  if (callback) {
    socket.on('rider_location_updated', callback);
  }
};

export const leaveRiderTracking = (orderId, callback) => {
  if (callback) {
    socket.off('rider_location_updated', callback);
  }
};

export default socket;
