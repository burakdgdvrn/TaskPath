import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';

export default function CreateWorkspaceModal({ onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createWorkspace(name, description);
      toast.success('Çalışma alanı oluşturuldu!');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Yeni Çalışma Alanı</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="ws-name">İsim</label>
                <input id="ws-name" className="input" autoFocus value={name} onChange={e => setName(e.target.value)} required placeholder="Örn: Freelance Projelerim" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="ws-desc">Açıklama</label>
                <textarea id="ws-desc" className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="İsteğe bağlı..." style={{ minHeight: '80px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginRight: 'var(--space-sm)' }}>İptal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
