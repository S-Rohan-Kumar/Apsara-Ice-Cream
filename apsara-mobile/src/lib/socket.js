import { io } from 'socket.io-client';
import { Platform } from 'react-native';

const getSocketUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  return 'http://192.168.1.5:8000';
};

const socket = io(getSocketUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: Infinity,
  transports: ['websocket', 'polling'],
});

const activeOrderRooms = new Set();

const parseOrderId = (orderId) => {
  if (!orderId) return '';
  if (typeof orderId === 'object') {
    return (orderId._id || orderId.orderId || orderId.id || '').toString();
  }
  return orderId.toString();
};

socket.on('connect', () => {
  activeOrderRooms.forEach((orderId) => {
    socket.emit('join_order', orderId);
  });
});

export const connectOrderSocket = (orderId, callback) => {
  const idStr = parseOrderId(orderId);
  if (!idStr) return;
  activeOrderRooms.add(idStr);
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', idStr);
  if (callback) {
    socket.on('status_update', callback);
    socket.on('order_status_updated', callback);
  }
};

export const leaveOrderSocket = (orderId, callback) => {
  if (callback) {
    socket.off('status_update', callback);
    socket.off('order_status_updated', callback);
  }
};

export const unsubscribeOrderSocket = (orderId) => {
  const idStr = parseOrderId(orderId);
  if (idStr) {
    activeOrderRooms.delete(idStr);
    socket.emit('leave_order', idStr);
  }
};

export const connectRiderTracking = (orderId, callback) => {
  const idStr = parseOrderId(orderId);
  if (!idStr) return;
  activeOrderRooms.add(idStr);
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_order', idStr);
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
