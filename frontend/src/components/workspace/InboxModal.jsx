import { useEffect, useState } from 'react';
import { X, Check, XCircle, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';

export default function InboxModal({ onClose }) {
  const invites = useWorkspaceStore(s => s.invites);
  const notifications = useWorkspaceStore(s => s.notifications);
  const fetchInvites = useWorkspaceStore(s => s.fetchInvites);
  const fetchNotifications = useWorkspaceStore(s => s.fetchNotifications);
  const acceptInvite = useWorkspaceStore(s => s.acceptInvite);
  const rejectInvite = useWorkspaceStore(s => s.rejectInvite);
  const readNotification = useWorkspaceStore(s => s.readNotification);
  const deleteNotification = useWorkspaceStore(s => s.deleteNotification);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchInvites();
    fetchNotifications();
  }, [fetchInvites, fetchNotifications]);

  const handleAccept = async (id) => {
    setLoadingId(id);
    try {
      await acceptInvite(id);
      toast.success('Davet kabul edildi');
    } catch (err) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id) => {
    setLoadingId(id);
    try {
      await rejectInvite(id);
      toast.success('Davet reddedildi');
    } catch (err) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <div className="modal-header">
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Inbox size={20} /> Gelen Kutusu
            </h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 'var(--space-xs)' }}>
            {invites.length === 0 && notifications.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-2xl) 0' }}>
                <p>Gelen kutun boş.</p>
                <p style={{ fontSize: 'var(--font-sm)' }}>Yeni bildirimler ve davetler burada görünecek.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                {/* İnvites */}
                {invites.map(invite => (
                  <div key={invite.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: 'var(--space-md)', background: 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' 
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {invite.workspace.name} (Davet)
                      </div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        <strong>{invite.sender.display_name}</strong> seni davet etti.
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      <button 
                        className="btn btn-ghost btn-icon btn-sm" 
                        title="Reddet"
                        onClick={() => handleReject(invite.id)}
                        disabled={loadingId === invite.id}
                        style={{ color: 'var(--error)' }}
                      >
                        <XCircle size={18} />
                      </button>
                      <button 
                        className="btn btn-primary btn-icon btn-sm" 
                        title="Kabul Et"
                        onClick={() => handleAccept(invite.id)}
                        disabled={loadingId === invite.id}
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Notifications */}
                {notifications.map(notif => (
                  <div key={notif.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: 'var(--space-md)', background: notif.is_read ? 'transparent' : 'var(--bg-secondary)', 
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                    borderLeft: notif.is_read ? '1px solid var(--border-subtle)' : '3px solid var(--accent-primary)',
                    opacity: notif.is_read ? 0.6 : 1,
                    transition: 'all 0.2s ease'
                  }}>
                    <div>
                      <div style={{ fontWeight: notif.is_read ? 400 : 500, color: 'var(--text-primary)' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        {notif.message}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                      {!notif.is_read && (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          onClick={() => {
                            setLoadingId(notif.id);
                            readNotification(notif.id).finally(() => setLoadingId(null));
                          }}
                          disabled={loadingId === notif.id}
                        >
                          Okundu
                        </button>
                      )}
                      <button 
                        className="btn btn-ghost btn-icon btn-sm" 
                        onClick={() => {
                          setLoadingId(notif.id + 'del');
                          deleteNotification(notif.id).finally(() => setLoadingId(null));
                        }}
                        disabled={loadingId === notif.id + 'del'}
                        title="Bildirimi Sil"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
