import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Users } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import { apiGetWorkspaceMessages, apiSendWorkspaceMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function WorkspaceChatModal({ workspaceId, workspaceName, onClose }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (workspaceId) {
      loadMessages();
    }
  }, [workspaceId]);

  const loadMessages = async () => {
    try {
      const data = await apiGetWorkspaceMessages(workspaceId);
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      const handleWsMessage = (e) => {
        if (e.detail?.type === 'chat:receive') {
          const msg = e.detail.message;
          if (msg.workspace_id === workspaceId) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
          }
        }
      };
      window.addEventListener('ws-message', handleWsMessage);
      return () => window.removeEventListener('ws-message', handleWsMessage);
    }
  }, [workspaceId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !workspaceId) return;
    
    try {
      await apiSendWorkspaceMessage(workspaceId, messageInput);
      setMessageInput('');
    } catch (err) {
      toast.error('Mesaj gönderilemedi');
    }
  };

  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{zIndex: 9999}}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{display: 'flex', flexDirection: 'column', height: '80vh', maxWidth: '600px'}}>
        
        <div className="modal-header" style={{padding: '16px 24px', background: 'var(--bg-tertiary)'}}>
          <div className="modal-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Users size={20} style={{color: 'var(--accent-violet)'}} />
            {workspaceName} - Ekip Sohbeti
          </div>
          <button className="btn-icon btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
          <div className="chat-messages" style={{background: 'var(--bg-primary)'}}>
            {messages.length === 0 ? (
              <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '14px'}}>
                Bu çalışma alanında henüz mesaj yok.
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={msg.id || i} className={`chat-bubble-container ${isMe ? 'me' : 'other'}`} style={{marginBottom: '12px'}}>
                    {!isMe && (
                      <div className="chat-avatar" style={{width: 32, height: 32, fontSize: 12, marginRight: 8, background: 'var(--accent-teal)'}}>
                        {msg.sender_display_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div style={{display: 'flex', flexDirection: 'column', maxWidth: '75%', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                      {!isMe && <span className="chat-bubble-sender">{msg.sender_display_name}</span>}
                      <div className={`chat-bubble ${isMe ? 'me' : 'other'}`}>
                        {msg.content}
                        <div className="chat-bubble-time">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-area" style={{background: 'var(--bg-secondary)', padding: '16px 24px'}}>
            <input 
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Ekibe bir mesaj gönder..."
              className="chat-input"
            />
            <button 
              type="submit"
              disabled={!messageInput.trim()}
              className="chat-fab"
              style={{width: '40px', height: '40px'}}
            >
              <Send size={18} style={{marginLeft: '2px'}}/>
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
}
