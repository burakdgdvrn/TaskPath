import { useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import useWorkspaceStore from '../stores/workspaceStore';

export default function useSocket() {
  const user = useAuthStore(s => s.user);
  const fetchWorkspaces = useWorkspaceStore(s => s.fetchWorkspaces);
  const fetchInvites = useWorkspaceStore(s => s.fetchInvites);
  const fetchNotifications = useWorkspaceStore(s => s.fetchNotifications);

  useEffect(() => {
    if (!user?.id) return;

    // Use wss:// in production, ws:// in dev
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running dev server on 5173, backend is on 8000
    const host = process.env.NODE_ENV === 'development' ? 'localhost:8000' : window.location.host;
    
    const ws = new WebSocket(`${protocol}//${host}/api/ws/${user.id}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Dispatch a global event so other components (like Chat) can listen
        window.dispatchEvent(new CustomEvent('ws:message', { detail: data }));
        
        if (data.type === 'REFRESH_WORKSPACE') {
          fetchWorkspaces();
        } else if (data.type === 'REFRESH_INVITES') {
          fetchInvites();
        } else if (data.type === 'REFRESH_INBOX') {
          fetchInvites();
          fetchNotifications();
        }
      } catch (err) {
        console.error("WebSocket message parsing error:", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      // Could implement reconnection logic here
    };

    return () => {
      ws.close();
    };
  }, [user?.id, fetchWorkspaces, fetchInvites]);
}
