import { useEffect, useRef } from 'react';
import useAuthStore from '../stores/authStore';
import useWorkspaceStore from '../stores/workspaceStore';
import useUIStore from '../stores/uiStore';

export default function useSocket() {
  const user = useAuthStore(s => s.user);
  const fetchWorkspaces = useWorkspaceStore(s => s.fetchWorkspaces);
  const fetchInvites = useWorkspaceStore(s => s.fetchInvites);
  const fetchNotifications = useWorkspaceStore(s => s.fetchNotifications);
  const incrementUnreadChat = useUIStore(s => s.incrementUnreadChat);

  // Use refs so the WS handlers always see the latest function references
  // without causing the effect to re-run and reconnect
  const handlersRef = useRef({ fetchWorkspaces, fetchInvites, fetchNotifications, incrementUnreadChat });
  handlersRef.current = { fetchWorkspaces, fetchInvites, fetchNotifications, incrementUnreadChat };

  useEffect(() => {
    if (!user?.id) return;

    let intentionalClose = false;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let ws = null;

    function connect() {
      // Use the backend URL from environment variables, replacing http with ws
      const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws');

      ws = new WebSocket(`${WS_BASE}/api/ws/${user.id}`);

      ws.onopen = () => {
        console.log('[Global WS] Connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { fetchWorkspaces, fetchInvites, fetchNotifications, incrementUnreadChat } = handlersRef.current;

          // Dispatch a global event so other components (like Chat) can listen
          window.dispatchEvent(new CustomEvent('ws:message', { detail: data }));

          if (data.type === 'REFRESH_WORKSPACE') {
            fetchWorkspaces();
          } else if (data.type === 'REFRESH_INVITES') {
            fetchInvites();
          } else if (data.type === 'REFRESH_INBOX') {
            fetchInvites();
            fetchNotifications();
          } else if (data.type === 'chat:receive') {
            // Increment unread badge for incoming chat messages
            const msg = data.message;
            if (msg && msg.sender_id !== user.id) {
              if (msg.workspace_id) {
                incrementUnreadChat(msg.workspace_id);
              } else if (msg.sender_id) {
                incrementUnreadChat(msg.sender_id);
              }
            }
          } else if (data.type === 'friend:request' || data.type === 'friend:updated') {
            incrementUnreadChat('friends');
          }
        } catch (err) {
          console.error("[Global WS] Message parsing error:", err);
        }
      };

      ws.onclose = () => {
        // Don't reconnect if we intentionally closed (component unmount / user change)
        if (intentionalClose) return;

        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`[Global WS] Disconnected, reconnecting in ${delay}ms (attempt ${reconnectAttempts})...`);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onerror = (err) => {
        console.error("[Global WS] Error:", err);
        // onclose will fire after this and handle reconnection
      };
    }

    connect();

    return () => {
      intentionalClose = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [user?.id]); // Only reconnect when user changes — handlers are accessed via ref
}
