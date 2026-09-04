import { useState } from 'react';
import { X, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import useUIStore from '../../stores/uiStore';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';

export default function CreateBoardModal({ initialProjectId = null }) {
  const { projectId: urlProjectId } = useParams();
  const effectiveProjectId = initialProjectId || urlProjectId || null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createBoard = useWorkspaceStore(s => s.createBoard);
  const projects = useWorkspaceStore(s => s.projects);
  const closeModal = useUIStore(s => s.closeCreateBoardModal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createBoard(name.trim(), description.trim(), effectiveProjectId);
      toast.success(`"${name}" oluşturuldu!`);
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Board oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Yeni Board Oluştur</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}><X /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label" htmlFor="board-name">Board Adı</label>
                <input id="board-name" className="input" type="text" placeholder="Görev panosu adı..." value={name} onChange={e => setName(e.target.value)} autoFocus required />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="board-desc">Açıklama</label>
                <textarea id="board-desc" className="input" placeholder="Bu pano ne hakkında? (opsiyonel)" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
