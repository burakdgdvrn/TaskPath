import { useEffect, useRef, useState, useCallback } from 'react';
import { createBoardWebSocket } from '../services/api';
import useBoardStore from '../stores/boardStore';
import toast from 'react-hot-toast';

/**
 * WebSocket hook for real-time board collaboration.
 * Handles: cursor sharing, live node/edge sync, online users.
 */
export default function useWebSocket(boardId) {
  const wsRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [cursors, setCursors] = useState({}); // userId -> {x, y, displayName, avatarColor}
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!boardId) return;

    const ws = createBoardWebSocket(boardId);
    if (!ws) return;

    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected to board:', boardId);
      if (reconnectAttempts.current >= 3) {
        toast.success("Canlı senkronizasyon yeniden sağlandı.");
      }
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'users:online':
            setOnlineUsers(data.users || []);
            break;

          case 'user:joined':
            setOnlineUsers(prev => {
              if (prev.find(u => u.user_id === data.user_id)) return prev;
              return [...prev, { user_id: data.user_id, display_name: data.display_name, avatar_color: data.avatar_color }];
            });
            break;

          case 'user:left':
            setOnlineUsers(prev => prev.filter(u => u.user_id !== data.user_id));
            setCursors(prev => {
              const next = { ...prev };
              delete next[data.user_id];
              return next;
            });
            break;

          case 'cursor:move':
            setCursors(prev => ({
              ...prev,
              [data.user_id]: {
                x: data.x,
                y: data.y,
                displayName: data.display_name,
                avatarColor: data.avatar_color,
              },
            }));
            break;

          // Live sync events — update local store
          case 'node:create':
          case 'node:update':
          case 'node:delete':
          case 'node:move':
          case 'edge:create':
          case 'edge:delete':
          case 'board:roadmap_imported':
            // Reload board data from server to stay in sync
            useBoardStore.getState().loadBoardData(boardId);
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      reconnectAttempts.current += 1;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      
      console.log(`[WS] Disconnected, reconnecting in ${delay}ms...`);
      if (reconnectAttempts.current === 3) {
        toast.error("Canlı senkronizasyon koptu. Yeniden bağlanmaya çalışılıyor...");
      }
      
      reconnectTimeout.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [boardId]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [connect]);

  // Send cursor position
  const sendCursor = useCallback((x, y) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'cursor:move', x, y }));
    }
  }, []);

  // Broadcast a node/edge change
  const broadcast = useCallback((type, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  return { onlineUsers, cursors, sendCursor, broadcast };
}
