import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Check, XCircle, Send, Plus, Users, Trash2, Pen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useUIStore from '../../stores/uiStore';
import { 
  apiListFriends, apiSendFriendRequest, apiUpdateFriendship, apiRemoveFriend,
  apiGetDirectMessages, apiSendDirectMessage, apiClearDirectMessages,
  apiEditMessage, apiDeleteMessageForEveryone
} from '../../services/api';
import toast from 'react-hot-toast';

function DoodleBackground({ theme }) {
  const color = theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(124, 58, 237, 0.08)";
  
  return (
    <svg 
      style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }}
    >
      <defs>
        <pattern id="chat-doodle-pattern" x="0" y="0" width="140" height="140" patternUnits="userSpaceOnUse">
          <g stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Heart */}
            <path d="M30 30 a5 5 0 0 0-7 0l-.5.5-.5-.5a5 5 0 0 0-7 7l.5.5L22.5 44.5 29.5 37.5l.5-.5a5 5 0 0 0 0-7z" />
            {/* Paper Plane */}
            <path d="M100 20 l-8 8 M100 20 l-5 15 -3-7 -6-3 14-5z" />
            {/* Smile */}
            <circle cx="110" cy="100" r="10" />
            <path d="M106 97 h.01 M114 97 h.01 M105 103 s2 3 5 3 5-3 5-3" />
            {/* Plus / Star */}
            <path d="M40 100 l0 10 M35 105 l10 0 M50 115 l2 -2 M48 115 l2 2" />
            {/* Wave */}
            <path d="M60 50 c5-5 10 5 15 0 s10 5 15 0" />
          </g>
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#chat-doodle-pattern)" />
    </svg>
  );
}

export default function GlobalChatWidget() {
  const { user } = useAuthStore();
  const { workspaces } = useWorkspaceStore();
  
  const isChatOpen = useUIStore(s => s.isChatOpen);
  const closeChat = useUIStore(s => s.closeChat);
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const theme = useUIStore(s => s.theme);
  const unreadChatCounts = useUIStore(s => s.unreadChatCounts);
  const clearUnreadChat = useUIStore(s => s.clearUnreadChat);
  const setActiveChatId = useUIStore(s => s.setActiveChatId);
  
  const [activeTab, setActiveTab] = useState('chats'); // chats, groups, friends
  const [friends, setFriends] = useState([]);
  
  const [selectedChat, setSelectedChat] = useState(null); // { id, name, type: 'direct' | 'workspace' }
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendIdInput, setFriendIdInput] = useState('');
  
  const messagesEndRef = useRef(null);

  const friendsBadge = unreadChatCounts['friends'] || 0;
  const chatsBadge = friends.filter(f => f.status === 'accepted').reduce((sum, friend) => {
    const friendId = friend.requester_id === user?.id ? friend.receiver_id : friend.requester_id;
    return sum + (unreadChatCounts[friendId] || 0);
  }, 0);
  const groupsBadge = (workspaces || []).reduce((sum, workspace) => {
    return sum + (unreadChatCounts[workspace.id] || 0);
  }, 0);

  useEffect(() => {
    if (isChatOpen) {
      setSelectedChat(null);
      setActiveTab('chats');
      if (user) loadFriends();
    }
  }, [isChatOpen, user]);
  
  const loadFriends = async () => {
    try {
      const data = await apiListFriends();
      setFriends(data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const loadMessages = async (chat) => {
    try {
      let data = [];
      if (chat.type === 'direct') {
        data = await apiGetDirectMessages(chat.id);
      } else if (chat.type === 'workspace') {
        const { apiGetWorkspaceMessages } = await import('../../services/api');
        data = await apiGetWorkspaceMessages(chat.id);
      }

      // Filter locally cleared messages only for workspaces
      // (Direct messages are handled by the backend's smart soft-delete system)
      if (chat.type === 'workspace') {
        const key = `chat_cleared_${user.id}_${chat.id}`;
        const clearedAt = localStorage.getItem(key);
        if (clearedAt) {
          const clearedTime = new Date(clearedAt).getTime();
          data = data.filter(m => {
            let t = m.created_at;
            // Force UTC parsing to prevent timezone offset bugs 
            if (!t.endsWith('Z') && !t.includes('+')) t += 'Z';
            return new Date(t).getTime() > clearedTime;
          });
        }
      }

      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      setActiveChatId(selectedChat.id);
      clearUnreadChat(selectedChat.id);
      loadMessages(selectedChat);
      
      const handleWsMessage = (e) => {
        if (e.detail?.type === 'chat:receive') {
          const msg = e.detail.message;
          if (
            (selectedChat.type === 'direct' && (msg.sender_id === selectedChat.id || msg.receiver_id === selectedChat.id)) ||
            (selectedChat.type === 'workspace' && msg.workspace_id === selectedChat.id)
          ) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
          }
        } else if (e.detail?.type === 'chat:update') {
          const updatedMsg = e.detail.message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
        } else if (e.detail?.type === 'friend:request' || e.detail?.type === 'friend:updated') {
            loadFriends();
        }
      };
      window.addEventListener('ws:message', handleWsMessage);
      return () => window.removeEventListener('ws:message', handleWsMessage);
    } else {
      setActiveChatId(null);
    }
  }, [selectedChat, setActiveChatId, clearUnreadChat]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;
    
    try {
      if (editingMessageId) {
        await apiEditMessage(editingMessageId, messageInput);
        setEditingMessageId(null);
        setMessageInput('');
        return;
      }
      
      let newMsg = null;
      if (selectedChat.type === 'direct') {
        newMsg = await apiSendDirectMessage(selectedChat.id, messageInput);
      } else if (selectedChat.type === 'workspace') {
        const { apiSendWorkspaceMessage } = await import('../../services/api');
        newMsg = await apiSendWorkspaceMessage(selectedChat.id, messageInput);
      }
      
      if (newMsg) {
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      }
      setMessageInput('');
    } catch (err) {
      toast.error('Mesaj gönderilemedi');
    }
  };

  const handleDeleteMessageForEveryone = async (msgId) => {
    try {
      await apiDeleteMessageForEveryone(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, content: '' } : m));
      toast.success("Mesaj herkesten silindi");
    } catch (err) {
      toast.error(err.message || "Mesaj silinemedi");
    }
  };

  const handleAddFriend = async (e) => {
      e.preventDefault();
      if (!friendIdInput.trim()) return;
      try {
          await apiSendFriendRequest(friendIdInput.trim());
          toast.success("Arkadaşlık isteği gönderildi!");
          setFriendIdInput('');
          setIsAddingFriend(false);
          loadFriends();
      } catch (err) {
          toast.error(err.message || "İstek gönderilirken hata oluştu");
      }
  };

  const handleClearChat = async () => {
    if (!selectedChat) return;
    try {
      if (selectedChat.type === 'direct') {
        // Backend handles individual soft-deletes beautifully for DMs
        await apiClearDirectMessages(selectedChat.id);
      } else {
        // For groups, we use local hiding to keep other users' chat intact
        const key = `chat_cleared_${user.id}_${selectedChat.id}`;
        localStorage.setItem(key, new Date().toISOString());
      }
      
      setMessages([]);
      toast.success("Sohbet geçmişi temizlendi");
    } catch (err) {
      toast.error("Sohbet temizlenemedi");
    }
  };

  if (!user) return null;

  return (
    <>
      {isChatOpen && (
        <motion.div 
          className={`chat-widget-container ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        >
          <div className="chat-widget-panel">
            
            <div className="chat-widget-header">
            {selectedChat ? (
              <div className="chat-widget-title" style={{cursor: 'pointer'}} onClick={() => setSelectedChat(null)}>
                <span style={{fontSize: '12px', marginRight: '8px'}}>&larr;</span>
                {selectedChat.name}
              </div>
            ) : (
              <div className="chat-widget-title">
                <MessageCircle size={18} /> Sohbetler
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedChat && (
                <button 
                  onClick={handleClearChat}
                  className="btn-icon btn-ghost btn-sm"
                  style={{ color: 'var(--text-muted)' }}
                  title="Sohbeti Temizle"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button 
                onClick={closeChat}
                className="btn-icon btn-ghost btn-sm"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="chat-content-area" style={{padding: 0}}>
            {!selectedChat ? (
              <>
                <div className="chat-tabs">
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`}
                    style={{position: 'relative'}}
                  >
                    Sohbetler
                    {chatsBadge > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {chatsBadge}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('groups')}
                    className={`chat-tab ${activeTab === 'groups' ? 'active' : ''}`}
                    style={{position: 'relative'}}
                  >
                    Gruplar
                    {groupsBadge > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {groupsBadge}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => { setActiveTab('friends'); clearUnreadChat('friends'); }}
                    className={`chat-tab ${activeTab === 'friends' ? 'active' : ''}`}
                    style={{position: 'relative'}}
                  >
                    Arkadaşlar
                    {friendsBadge > 0 && (
                      <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {friendsBadge}
                      </span>
                    )}
                  </button>
                </div>

                <div style={{flex: 1, overflowY: 'auto', padding: '8px'}}>
                  {activeTab === 'chats' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      {friends.filter(f => f.status === 'accepted').length === 0 ? (
                        <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px'}}>
                          Henüz arkadaşınız yok.
                        </div>
                      ) : (
                        friends.filter(f => f.status === 'accepted').map(friend => {
                          const friendId = friend.requester_id === user.id ? friend.receiver_id : friend.requester_id;
                          return (
                            <button 
                              key={friend.id}
                              onClick={() => setSelectedChat({ id: friendId, name: friend.friend_display_name, type: 'direct' })}
                              className="chat-list-item"
                            >
                              <div className="chat-avatar" style={{ backgroundColor: friend.friend_avatar_color || 'var(--accent-violet)' }}>
                                {friend.friend_avatar_base64 ? (
                                  <img src={friend.friend_avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  friend.friend_display_name?.[0]?.toUpperCase()
                                )}
                              </div>
                              <div className="chat-list-info">
                                <div className="chat-list-name">{friend.friend_display_name}</div>
                                <div className="chat-list-preview">Sohbeti açmak için tıkla</div>
                              </div>
                              {unreadChatCounts[friendId] > 0 && (
                                <span style={{ background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginLeft: 'auto' }}>
                                  {unreadChatCounts[friendId]}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === 'groups' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      {!workspaces || workspaces.length === 0 ? (
                        <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '12px'}}>
                          Henüz bir çalışma alanında değilsiniz.
                        </div>
                      ) : (
                        workspaces.map(workspace => (
                          <button 
                            key={workspace.id}
                            onClick={() => setSelectedChat({ id: workspace.id, name: workspace.name, type: 'workspace' })}
                            className="chat-list-item"
                          >
                            <div className="chat-avatar" style={{ backgroundColor: 'var(--accent-teal)' }}>
                              <Users size={20} />
                            </div>
                            <div className="chat-list-info">
                              <div className="chat-list-name">{workspace.name}</div>
                              <div className="chat-list-preview">Ekip sohbetine katıl</div>
                            </div>
                            {unreadChatCounts[workspace.id] > 0 && (
                                <span style={{ background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 20, height: 20, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginLeft: 'auto' }}>
                                  {unreadChatCounts[workspace.id]}
                                </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'friends' && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                      
                      {!isAddingFriend ? (
                        <button 
                          onClick={() => setIsAddingFriend(true)}
                          className="btn btn-secondary"
                          style={{width: '100%', justifyContent: 'center'}}
                        >
                          <Plus size={16} /> Arkadaş Ekle
                        </button>
                      ) : (
                        <form onSubmit={handleAddFriend} style={{display: 'flex', gap: '8px', padding: '0 8px'}}>
                          <input 
                            type="text"
                            value={friendIdInput}
                            onChange={(e) => setFriendIdInput(e.target.value)}
                            placeholder="Kullanıcı ID'sini girin..."
                            className="input"
                            style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
                            autoFocus
                          />
                          <button type="submit" className="btn btn-primary btn-sm">Ekle</button>
                          <button type="button" onClick={() => setIsAddingFriend(false)} className="btn-icon btn-ghost btn-sm">
                            <X size={14} />
                          </button>
                        </form>
                      )}

                      <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                        <div style={{fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px'}}>
                            Gelen İstekler
                        </div>
                        {friends.filter(f => f.status === 'pending' && f.receiver_id === user.id).length === 0 && (
                           <div style={{padding: '0 8px', fontSize: '12px', color: 'var(--text-muted)'}}>İstek yok</div>
                        )}
                        {friends.filter(f => f.status === 'pending' && f.receiver_id === user.id).map(f => (
                           <div key={f.id} className="chat-list-item" style={{cursor: 'default', padding: '8px', background: 'var(--glass-bg)'}}>
                              <div className="chat-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', backgroundColor: f.friend_avatar_color || 'var(--accent-violet)' }}>
                                {f.friend_avatar_base64 ? (
                                  <img src={f.friend_avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  f.friend_display_name?.[0]?.toUpperCase()
                                )}
                              </div>
                              <span className="chat-list-name" style={{flex: 1}}>{f.friend_display_name}</span>
                              <div style={{display: 'flex', gap: '4px'}}>
                                 <button onClick={() => apiUpdateFriendship(f.id, 'accepted').then(loadFriends)} className="btn-icon btn-ghost btn-sm" style={{color: 'var(--accent-teal)'}}><Check size={16}/></button>
                                 <button onClick={() => apiUpdateFriendship(f.id, 'rejected').then(loadFriends)} className="btn-icon btn-ghost btn-sm" style={{color: 'var(--accent-rose)'}}><XCircle size={16}/></button>
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="chat-view-container" style={{display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden'}}>
                <DoodleBackground theme={theme} />
                <div className="chat-messages" style={{ zIndex: 1, position: 'relative' }}>
                  {messages.length === 0 ? (
                    <div style={{
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'var(--text-muted)', 
                      background: 'transparent',
                      alignSelf: 'center', 
                      margin: 'auto',
                      gap: '8px'
                    }}>
                      <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '50%', marginBottom: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <MessageCircle size={28} style={{ color: 'var(--accent-violet)', opacity: 0.9 }} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Henüz mesaj yok</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '200px', lineHeight: '1.4' }}>
                        Bir mesaj göndererek sohbete başlayın
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe = msg.sender_id === user.id;
                      // We can rely on sender_avatar_color and sender_avatar_base64 provided by the backend!
                      const otherAvatarBase64 = msg.sender_avatar_base64;
                      const otherAvatarColor = msg.sender_avatar_color;
                      const otherInitials = msg.sender_display_name?.[0]?.toUpperCase();
                      
                      let t = msg.created_at;
                      if (!t.endsWith('Z') && !t.includes('+')) t += 'Z';
                      const isEditable = (new Date().getTime() - new Date(t).getTime()) < 15 * 60 * 1000;
                      
                      return (
                        <div 
                          key={msg.id || i} 
                          className={`chat-bubble-container ${isMe ? 'me' : 'other'}`}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {!isMe && (
                            <div className="chat-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', backgroundColor: otherAvatarColor || 'var(--accent-teal)', marginRight: '8px', alignSelf: 'flex-end', marginBottom: '16px', overflow: 'hidden' }}>
                              {otherAvatarBase64 ? (
                                <img src={otherAvatarBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                otherInitials || '?'
                              )}
                            </div>
                          )}
                          <div style={{display: 'flex', flexDirection: 'column', maxWidth: '80%', alignItems: isMe ? 'flex-end' : 'flex-start', position: 'relative'}}>
                            {/* Hover Actions */}
                            {isMe && !msg.is_deleted && hoveredMessageId === msg.id && isEditable && (
                              <div style={{ position: 'absolute', right: '0px', top: '-30px', display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10 }}>
                                <button onClick={() => { setEditingMessageId(msg.id); setMessageInput(msg.content); }} className="btn-icon btn-ghost btn-sm" title="Düzenle">
                                  <Pen size={12} style={{color: 'var(--text-secondary)'}} />
                                </button>
                                <button onClick={() => handleDeleteMessageForEveryone(msg.id)} className="btn-icon btn-ghost btn-sm" title="Herkesten Sil">
                                  <Trash2 size={12} style={{color: 'var(--accent-rose)'}} />
                                </button>
                              </div>
                            )}
                            
                            <div className={`chat-bubble ${isMe ? 'me' : 'other'}`} style={{ opacity: msg.is_deleted ? 0.85 : 1, fontStyle: msg.is_deleted ? 'italic' : 'normal' }}>
                              {selectedChat.type === 'workspace' && !isMe && (
                                <span className="chat-bubble-sender">{msg.sender_display_name}</span>
                              )}
                              
                              {msg.is_deleted ? (
                                <span>Bu mesaj silindi</span>
                              ) : (
                                msg.content
                              )}
                              
                              <div className="chat-bubble-time" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {msg.is_edited && !msg.is_deleted && <span style={{fontSize: '9px', opacity: 0.7}}>(Düzenlendi)</span>}
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          {isMe && (
                            <div className="chat-avatar" style={{ width: '28px', height: '28px', fontSize: '10px', backgroundColor: user.avatarColor || 'var(--accent-violet)', marginLeft: '8px', alignSelf: 'flex-end', marginBottom: '16px', overflow: 'hidden' }}>
                              {user.avatar_base64 ? (
                                <img src={user.avatar_base64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                user.displayName?.[0]?.toUpperCase() || '?'
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {editingMessageId && (
                  <div style={{ padding: '8px 12px', background: 'var(--glass-bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', zIndex: 2, backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                      <Pen size={14} style={{ color: 'var(--accent-violet)' }}/>
                      <span style={{fontWeight: 500}}>Mesajı Düzenle</span>
                    </div>
                    <button onClick={() => { setEditingMessageId(null); setMessageInput(''); }} className="btn-icon btn-ghost btn-sm">
                      <X size={14} />
                    </button>
                  </div>
                )}
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!messageInput.trim()) return;
                    handleSendMessage(e);
                  }} 
                  className="chat-input-area"
                  style={{ zIndex: 1, position: 'relative' }}
                >
                  <textarea 
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (messageInput.trim()) {
                          handleSendMessage(e);
                          e.target.style.height = 'auto';
                        }
                      }
                    }}
                    placeholder="Mesaj yazın..."
                    className="chat-input"
                    rows={1}
                  />
                  <button 
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="chat-send-btn"
                  >
                    <Send size={18} style={{marginLeft: '2px'}}/>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
        </motion.div>
      )}
    </>
  );
}
