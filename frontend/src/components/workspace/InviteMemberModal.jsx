import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import { apiSendInvite } from '../../services/api';
import toast from 'react-hot-toast';

export default function InviteMemberModal({ onClose }) {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !activeWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await apiSendInvite(activeWorkspaceId, username.trim());
      toast.success('Davet gönderildi!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Davet gönderilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Üye Davet Et</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="inv-username">Kullanıcı Adı (Benzersiz ID)</label>
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                  <input 
                    id="inv-username" 
                    className="input" 
                    autoFocus 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    required 
                    placeholder="Örn: burakdev" 
                    style={{ paddingLeft: 40 }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginRight: 'var(--space-sm)' }}>İptal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !username.trim()}>
                  {isSubmitting ? 'Gönderiliyor...' : 'Davet Et'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
