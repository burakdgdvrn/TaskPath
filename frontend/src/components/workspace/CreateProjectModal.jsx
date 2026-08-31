import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';

export default function CreateProjectModal({ onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createProject = useWorkspaceStore(s => s.createProject);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createProject(name, description);
      toast.success('Proje oluşturuldu!');
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
            <h2 className="modal-title">Yeni Proje (Klasör)</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="proj-name">İsim</label>
                <input id="proj-name" className="input" autoFocus value={name} onChange={e => setName(e.target.value)} required placeholder="Örn: Mobil Uygulama" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="proj-desc">Açıklama</label>
                <textarea id="proj-desc" className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="İsteğe bağlı..." style={{ minHeight: '80px', resize: 'vertical' }} />
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
