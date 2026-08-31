import { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useWorkspaceStore from '../../stores/workspaceStore';
import toast from 'react-hot-toast';
import { apiUpdateBoard } from '../../services/api';

export default function EditBoardModal({ board, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(''); // empty string means "Free board"
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateBoard = useWorkspaceStore(s => s.updateBoard); // Note: workspaceStore does not have updateBoard yet! Wait, let me check. Actually apiUpdateBoard is there.
  // Wait, I forgot to add updateBoard to workspaceStore. I'll need to do that!
  // But wait, the component imports useBoardStore for updateBoard. I will fix workspaceStore next.
  // Actually, I can just use apiUpdateBoard directly here, or add it to workspaceStore. 
  // Let's add it to workspaceStore.
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const projects = useWorkspaceStore(s => s.projects);
  const fetchWorkspaceContent = useWorkspaceStore(s => s.fetchWorkspaceContent);

  useEffect(() => {
    if (board) {
      setName(board.name || '');
      setDescription(board.description || '');
      setProjectId(board.project_id || '');
    }
  }, [board]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    setIsSubmitting(true);
    try {
      await apiUpdateBoard(activeWorkspaceId, board.id, {
        name: name.trim(),
        description: description.trim(),
        project_id: projectId === '' ? null : projectId
      });
      toast.success(`"${name}" güncellendi!`);
      await fetchWorkspaceContent(activeWorkspaceId); // reload boards
      onClose();
    } catch (err) {
      toast.error(err.message || 'Board güncellenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!board) return null;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', duration: 0.4 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Board Düzenle</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X /></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="input-group">
                <label className="input-label" htmlFor="edit-board-name">Board Adı</label>
                <input id="edit-board-name" className="input" type="text" placeholder="Board adını gir" value={name} onChange={e => setName(e.target.value)} autoFocus required />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="edit-board-desc">Açıklama</label>
                <textarea id="edit-board-desc" className="input" placeholder="Açıklama (opsiyonel)" value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="edit-board-proj">Klasör (Proje)</label>
                <div style={{ position: 'relative' }}>
                  <Folder style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                  <select id="edit-board-proj" className="input" value={projectId} onChange={e => setProjectId(e.target.value)} style={{ paddingLeft: 40, appearance: 'none' }}>
                    <option value="">Görev Panoları</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: 12, top: 14, pointerEvents: 'none', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--text-muted)' }} />
                </div>
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
