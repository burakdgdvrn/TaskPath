import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';

export default function EditProjectModal({ project, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const updateProject = useWorkspaceStore(s => s.updateProject);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await updateProject(activeWorkspaceId, project.id, name.trim(), description.trim());
      toast.success('Klasör güncellendi');
      onClose();
    } catch (err) {
      toast.error('Klasör güncellenemedi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Klasörü Düzenle</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="ep-name">Klasör Adı</label>
                <input 
                  id="ep-name" 
                  className="input" 
                  autoFocus 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="ep-desc">Açıklama (İsteğe Bağlı)</label>
                <textarea 
                  id="ep-desc" 
                  className="input" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  rows={3} 
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginRight: 'var(--space-sm)' }}>İptal</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting || !name.trim()}>
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
