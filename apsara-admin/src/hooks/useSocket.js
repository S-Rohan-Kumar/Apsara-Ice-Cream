import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { SOCKET_URL } from '../constants.js';
import { selectUserInfo } from '../slices/authSlice.js';
import {
  setConnected,
  setDisconnected,
  addOrderAlert,
  selectSoundEnabled,
} from '../slices/socketSlice.js';
import { apiSlice } from '../slices/apiSlice.js';
import { playOrderChime } from '../utils/sound.js';

export function useSocket() {
  const userInfo = useSelector(selectUserInfo);
  const soundEnabled = useSelector(selectSoundEnabled);
  const dispatch = useDispatch();
  const socketRef = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const localToken = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('userInfo') || '{}');
      return parsed.accessToken || parsed.token || '';
    } catch {
      return '';
    }
  })();

  const token = userInfo?.accessToken || userInfo?.token || localToken;

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      dispatch(setConnected());
      socket.emit('join_admin');
      socket.emit('admin_join');
      socket.emit('join', 'admin');
      socket.emit('join', 'orders');
    });

    const handleNewOrder = (orderData) => {
      if (soundEnabledRef.current) {
        playOrderChime();
      }
      if (orderData) {
        dispatch(addOrderAlert(orderData));
      }
      dispatch(apiSlice.util.invalidateTags(['Order']));
    };

    const EVENTS = [
      'new_order',
      'newOrder',
      'order_created',
      'order:created',
      'order_placed',
      'orderPlaced',
      'order',
      'ORDER_CREATED',
      'order:new',
      'order_update'
    ];

    EVENTS.forEach((evt) => {
      socket.on(evt, handleNewOrder);
    });

    const handleStatusUpdate = () => {
      dispatch(apiSlice.util.invalidateTags(['Order']));
    };

    const STATUS_EVENTS = [
      'order_status_update',
      'orderStatusUpdate',
      'status_update',
      'order_delivered',
      'order:status',
    ];

    STATUS_EVENTS.forEach((evt) => {
      socket.on(evt, handleStatusUpdate);
    });

    socket.on('disconnect', () => dispatch(setDisconnected()));

    return () => {
      EVENTS.forEach((evt) => {
        socket.off(evt, handleNewOrder);
      });
      STATUS_EVENTS.forEach((evt) => {
        socket.off(evt, handleStatusUpdate);
      });
      socket.disconnect();
      dispatch(setDisconnected());
    };
  }, [token, dispatch]);
}
