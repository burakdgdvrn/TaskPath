import { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';

export default function EditWorkspaceModal({ workspace, onClose }) {
  const [name, setName] = useState(workspace?.name || '');
  const [description, setDescription] = useState(workspace?.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const updateWorkspace = useWorkspaceStore(s => s.updateWorkspace);

  if (!workspace) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await updateWorkspace(workspace.id, name.trim(), description.trim());
      toast.success('Çalışma alanı güncellendi');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Güncellenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Çalışma Alanını Düzenle</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label" htmlFor="ws-name">İsim</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                  <input id="ws-name" className="input" type="text" value={name} onChange={e => setName(e.target.value)} style={{ paddingLeft: 40 }} autoFocus required />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="ws-desc">Açıklama</label>
                <textarea id="ws-desc" className="input" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
