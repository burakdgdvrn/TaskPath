import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Mail, UserPlus, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { apiSendInvite, apiListWorkspaceInvites, apiRemoveWorkspaceMember } from '../../services/api';

export default function WorkspaceMembersModal({ workspace, onClose }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invites'
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  
  // Invite form
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Custom remove and invite confirmation
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removedMessage, setRemovedMessage] = useState('');
  const [inviteSuccessMessage, setInviteSuccessMessage] = useState('');

  const currentUser = useAuthStore(s => s.user);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const currentWorkspace = workspaces.find(w => w.id === workspace?.id) || workspace;
  
  // Am I the owner? (Only owners can remove members or send invites in this basic permission model)
  const isOwner = currentWorkspace?.owner_id === currentUser?.id || currentWorkspace?.members?.some(m => m.user.id === currentUser?.id && m.role === 'owner');

  const loadInvites = async () => {
    if (!currentWorkspace) return;
    setLoadingInvites(true);
    try {
      const data = await apiListWorkspaceInvites(currentWorkspace.id);
      setInvites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'invites') {
      loadInvites();
    }
  }, [activeTab, currentWorkspace]);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;

    setIsSending(true);
    try {
      await apiSendInvite(currentWorkspace.id, inviteIdentifier);
      setInviteSuccessMessage('Davet başarıyla gönderildi.');
      setTimeout(() => setInviteSuccessMessage(''), 3000);
      setInviteIdentifier('');
      loadInvites();
    } catch (err) {
      toast.error(err.message || 'Davet gönderilemedi');
    } finally {
      setIsSending(false);
    }
  };

  const handleRemoveMemberConfirm = async (memberId) => {
    try {
      await apiRemoveWorkspaceMember(currentWorkspace.id, memberId);
      
      setRemovedMessage('Üye başarıyla çıkarıldı.');
      setTimeout(() => setRemovedMessage(''), 3000);
      setMemberToRemove(null);
      
      // Trigger a reload of workspaces to get updated members
      useWorkspaceStore.getState().fetchWorkspaces();
    } catch (err) {
      toast.error(err.message || 'Üye çıkarılamadı');
      setMemberToRemove(null);
    }
  };

  if (!workspace) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '600px', width: '90%' }}
        >
          <div className="modal-header">
            <h2 className="modal-title">Üyeleri Yönet: {currentWorkspace.name}</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
              <X />
            </button>
          </div>

          <div style={{ padding: '0 var(--space-xl)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: 'var(--space-md)' }}>
            <button 
              className={`btn btn-ghost ${activeTab === 'members' ? 'active' : ''}`}
              style={{ borderRadius: 0, borderBottom: activeTab === 'members' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '12px' }}
              onClick={() => setActiveTab('members')}
            >
              <Users size={18} style={{ marginRight: 8 }}/> Mevcut Üyeler
            </button>
            {isOwner && (
              <button 
                className={`btn btn-ghost ${activeTab === 'invites' ? 'active' : ''}`}
                style={{ borderRadius: 0, borderBottom: activeTab === 'invites' ? '2px solid var(--primary)' : '2px solid transparent', paddingBottom: '12px' }}
                onClick={() => setActiveTab('invites')}
              >
                <Mail size={18} style={{ marginRight: 8 }}/> Davetler
              </button>
            )}
          </div>

          <div className="modal-body" style={{ minHeight: '300px' }}>
            {activeTab === 'members' && (
              <div style={{ padding: 'var(--space-md)' }}>
                {removedMessage && (
                  <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 'var(--radius-sm)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
                    {removedMessage}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {currentWorkspace.members?.map(member => (
                    <div key={member.user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          borderRadius: '16px', 
                          background: member.user.avatar_base64 ? `url(${member.user.avatar_base64}) center/cover` : (member.user.avatar_color || 'var(--accent-primary)'), 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontWeight: 600, 
                          fontSize: '14px',
                          border: member.user.avatar_base64 ? '1px solid var(--border-subtle)' : 'none'
                        }}>
                          {!member.user.avatar_base64 && member.user.display_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>
                            {member.user.display_name}
                            {member.user.id === currentUser?.id && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (Sen)</span>}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{member.user.username}</div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        {member.role === 'owner' ? (
                          <span style={{ fontSize: '11px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '12px' }}>Kurucu</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Üye</span>
                        )}
                        
                        {isOwner && member.user.id !== currentUser?.id && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            {memberToRemove === member.user.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button onClick={() => handleRemoveMemberConfirm(member.user.id)} className="btn btn-sm" style={{ padding: '2px 8px', fontSize: '10px', background: '#ef4444', color: 'white', border: 'none', height: '24px' }}>Emin misin?</button>
                                <button onClick={() => setMemberToRemove(null)} className="btn btn-sm" style={{ padding: '2px 8px', fontSize: '10px', height: '24px' }}>İptal</button>
                              </div>
                            ) : (
                              <button 
                                className="btn btn-ghost btn-icon" 
                                style={{ color: 'var(--accent-red)', width: 28, height: 28 }}
                                onClick={() => setMemberToRemove(member.user.id)}
                                title="Üyeyi Çıkar"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'invites' && isOwner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                {/* Send Invite Form */}
                <div style={{ background: 'var(--bg-card)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)' }}>Yeni Üye Davet Et</h3>
                  <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="E-posta veya Benzersiz ID (@kullaniciadi)"
                      value={inviteIdentifier}
                      onChange={e => setInviteIdentifier(e.target.value)}
                      style={{ flex: 1 }}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={isSending || !inviteIdentifier}>
                      <UserPlus size={18} style={{ marginRight: 6 }}/> {isSending ? 'Gönderiliyor...' : 'Davet Et'}
                    </button>
                  </form>
                </div>

                {/* Sent Invites List */}
                <div>
                  <h3 style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-sm)', color: 'var(--text-muted)' }}>Gönderilen Davetler</h3>
                  
                  {loadingInvites ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)' }}>Yükleniyor...</div>
                  ) : invites.filter(i => i.status !== 'accepted').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                      {invites.filter(i => i.status !== 'accepted').map(invite => (
                        <div key={invite.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-sm) var(--space-md)', background: 'var(--bg-body)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 'var(--font-sm)' }}>{invite.receiver?.display_name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{invite.receiver?.username}</div>
                          </div>
                          
                          <div>
                            {invite.status === 'pending' && <span style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '4px 8px', borderRadius: '12px' }}>Bekliyor</span>}
                            {invite.status === 'rejected' && <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 8px', borderRadius: '12px' }}>Reddedildi</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                      Bekleyen veya geçmiş davetiniz bulunmuyor.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
