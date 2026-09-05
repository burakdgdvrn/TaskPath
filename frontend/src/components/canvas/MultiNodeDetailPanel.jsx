import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Trash2, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import useBoardStore from '../../stores/boardStore';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';

export default function MultiNodeDetailPanel({ nodes, boardId, onClose, broadcast }) {
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const users = activeWorkspace?.members?.map(m => m.user) || [];
  
  const [formData, setFormData] = useState({
    status: '', // empty means no change
    priority: '',
    assignedTo: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const bulkUpdateNodes = useBoardStore(s => s.bulkUpdateNodes);
  const bulkDeleteNodes = useBoardStore(s => s.bulkDeleteNodes);

  const handleSave = async () => {
    // Only send fields that were changed
    const payload = { node_ids: nodes.map(n => n.id) };
    if (formData.status) payload.status = formData.status;
    if (formData.priority) payload.priority = formData.priority;
    if (formData.assignedTo) {
        payload.assigned_to = formData.assignedTo === 'none' ? 'UNASSIGN' : formData.assignedTo;
    }

    if (Object.keys(payload).length === 1) {
      toast('Değişiklik yapılmadı');
      return;
    }

    const loadToast = toast.loading('Toplu güncelleniyor...');
    setIsSaving(true);
    try {
      await bulkUpdateNodes(boardId, payload);
      toast.success(`${nodes.length} görev güncellendi`, { id: loadToast });
      
      // Broadcast changes to peers
      payload.node_ids.forEach(id => {
        broadcast('node:update', { node_id: id });
      });
      
      onClose();
    } catch (err) {
      toast.error('Sunucu hatası', { id: loadToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const loadToast = toast.loading('Siliniyor...');
    try {
      const nodeIds = nodes.map(n => n.id);
      await bulkDeleteNodes(boardId, nodeIds);
      toast.success('Görevler silindi', { id: loadToast });
      
      // Broadcast deletions
      nodeIds.forEach(id => {
        broadcast('node:delete', { node_id: id });
      });
      
      onClose();
    } catch (err) {
      toast.error('Silme hatası', { id: loadToast });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="node-detail-panel"
        initial={{ x: 360 }}
        animate={{ x: 0 }}
        exit={{ x: 360 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="node-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={20} className="text-accent" />
            <h3 style={{ margin: 0 }}>{nodes.length} Görev Seçildi</h3>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="node-detail-body">
          <div className="alert alert-info" style={{ marginBottom: 'var(--space-md)' }}>
            Burada yaptığınız değişiklikler seçili <strong>{nodes.length}</strong> hücreye birden uygulanır.
          </div>

          <div className="input-group">
            <label className="input-label">Durum</label>
            <select
              className="input"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="">Değiştirme</option>
              <option value="todo">Yapılacak</option>
              <option value="in_progress">Devam Ediyor</option>
              <option value="testing">Test Ediliyor</option>
              <option value="done">Tamamlandı</option>
              <option value="archived">Arşiv</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Öncelik</label>
            <select
              className="input"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="">-- Değiştirme --</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Atanan Kişi</label>
            <select
              className="input"
              value={formData.assignedTo}
              onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
            >
              <option value="">-- Değiştirme --</option>
              <option value="none">Kimse (Atamayı Kaldır)</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="node-detail-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--error)' }}>
            <Trash2 size={16} /> Toplu Sil
          </button>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose}>İptal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Kayded...' : 'Kaydet'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
