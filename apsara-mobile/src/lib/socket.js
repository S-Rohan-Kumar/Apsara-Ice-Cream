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

const activeOrderRooms = new Set();

socket.on('connect', () => {
  activeOrderRooms.forEach((orderId) => {
    socket.emit('join_order', orderId);
  });
});

export const connectOrderSocket = (orderId, callback) => {
  if (!orderId) return;
  activeOrderRooms.add(orderId);
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', orderId);
  if (callback) {
    socket.on('status_update', callback);
  }
};

export const leaveOrderSocket = (orderId, callback) => {
  if (orderId) {
    activeOrderRooms.delete(orderId);
    socket.emit('leave_order', orderId);
  }
  if (callback) {
    socket.off('status_update', callback);
  } else {
    socket.off('status_update');
  }
};

export const connectRiderTracking = (orderId, callback) => {
  if (!orderId) return;
  activeOrderRooms.add(orderId);
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', orderId);
  if (callback) {
    socket.on('rider_location_updated', callback);
  }
};

export const leaveRiderTracking = (orderId, callback) => {
  if (orderId) {
    activeOrderRooms.delete(orderId);
    socket.emit('leave_order', orderId);
  }
  if (callback) {
    socket.off('rider_location_updated', callback);
  } else {
    socket.off('rider_location_updated');
  }
};

export default socket;
