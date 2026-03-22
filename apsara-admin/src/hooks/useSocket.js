import { useEffect, useRef } from 'react';
import { io }                from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { SOCKET_URL }        from '../constants.js';
import { selectUserInfo }    from '../slices/authSlice.js';
import {
  setConnected, setDisconnected, incrementOrders,
} from '../slices/socketSlice.js';
import { apiSlice } from '../slices/apiSlice.js';
 
export function useSocket() {
  const userInfo  = useSelector(selectUserInfo);
  const dispatch  = useDispatch();
  const socketRef = useRef(null);
  const dingRef   = useRef(new Audio('/ding.mp3'));
 
  useEffect(() => {
    if (!userInfo?.token) return;
 
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
 
    socket.on('connect', () => {
      dispatch(setConnected());
      socket.emit('join_admin'); 
    });
 
    socket.on('new_order', () => {
      dingRef.current.play().catch(() => {}); 
      dispatch(apiSlice.util.invalidateTags(['Order']));
    });
 
    socket.on('disconnect', () => dispatch(setDisconnected()));
 
    return () => {
      socket.disconnect();
      dispatch(setDisconnected());
    };
  }, [userInfo?.token]);
}
