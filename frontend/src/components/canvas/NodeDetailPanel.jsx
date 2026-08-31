import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Save, Target, PlayCircle, StopCircle, Flag } from 'lucide-react';
import useBoardStore from '../../stores/boardStore';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import { apiAssignTree } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Yapılacak' },
  { value: 'in_progress', label: 'Devam Ediyor' },
  { value: 'testing', label: 'Test Ediliyor' },
  { value: 'done', label: 'Tamamlandı' },
  { value: 'archived', label: 'Arşiv' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Düşük', color: '#22c55e' },
  { value: 'medium', label: 'Orta', color: '#f59e0b' },
  { value: 'high', label: 'Yüksek', color: '#f43f5e' },
];

export default function NodeDetailPanel({ node, boardId, onClose, broadcast }) {
  const updateNode = useBoardStore(s => s.updateNode);
  const deleteNode = useBoardStore(s => s.deleteNode);
  const users = useAuthStore(s => s.users);
  
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const isPersonalWorkspace = activeWorkspace && (!activeWorkspace.members || activeWorkspace.members.length <= 1);

  const [label, setLabel] = useState(node?.data?.label || '');
  const [description, setDescription] = useState(node?.data?.description || '');
  const [status, setStatus] = useState(node?.data?.status || 'todo');
  const [priority, setPriority] = useState(node?.data?.priority || 'medium');
  const [assignedTo, setAssignedTo] = useState(node?.data?.assignedTo || '');
  const [tagsInput, setTagsInput] = useState((node?.data?.tags || []).join(', '));
  const [assignToTree, setAssignToTree] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label || '');
      setDescription(node.data.description || '');
      setStatus(node.data.status || 'todo');
      setPriority(node.data.priority || 'medium');
      setAssignedTo(node.data.assignedTo || '');
      setTagsInput((node.data.tags || []).join(', '));
    }
  }, [node?.id]);

  if (!node) return null;

  const handleSave = async () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const loadToast = toast.loading('Görev güncelleniyor...');
    try {
      await updateNode(boardId, node.id, {
        data: {
          label,
          description,
          status,
          priority,
          assignedTo: assignedTo || null,
          tags,
        },
      });
      broadcast?.('node:update', { node_id: node.id });
      
      if (assignToTree && assignedTo) {
        toast.loading('Ağaçtaki görevler atanıyor...', { id: loadToast });
        const updatedNodeIds = await apiAssignTree(boardId, node.id, assignedTo);
        useBoardStore.getState().loadBoardData(boardId);
        updatedNodeIds.forEach(id => {
          broadcast?.('node:update', { node_id: id });
        });
      }
      
      toast.success('Görev güncellendi', { id: loadToast });
      onClose();
    } catch (err) {
      toast.error('Sunucu hatası, lütfen tekrar deneyin', { id: loadToast });
    }
  };

  const handleDelete = async () => {
    await deleteNode(boardId, node.id);
    broadcast?.('node:delete', { node_id: node.id });
    toast.success('Görev silindi');
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
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
        onKeyDown={handleKeyDown}
      >
        <div className="node-detail-header" style={{
          borderBottom: node.type === 'startNode' ? '1px solid var(--accent-emerald)' 
                      : node.type === 'endNode' ? '1px solid var(--accent-rose)'
                      : node.type === 'milestoneNode' ? '1px solid var(--accent-violet)'
                      : '1px solid var(--border-default)'
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {node.type === 'startNode' && <PlayCircle size={18} className="text-emerald-500" strokeWidth={1.5} />}
            {node.type === 'endNode' && <Flag size={18} className="text-rose-500" strokeWidth={1.5} />}
            {node.type === 'milestoneNode' && <Target size={18} className="text-violet-500" strokeWidth={1.5} />}
            {node.type === 'startNode' ? 'Faz Başlatma' 
              : node.type === 'endNode' ? 'Faz Tamamlanma' 
              : node.type === 'milestoneNode' ? 'Stratejik Hedef'
              : node.type === 'wikiNode' ? 'Not Detayı'
              : 'Görev Detayı'}
          </h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="node-detail-body">
          {/* Custom Header Input for Special Nodes */}
          {(node.type === 'startNode' || node.type === 'endNode' || node.type === 'milestoneNode') ? (
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Başlık girin..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  padding: '8px 0',
                  borderBottom: '1px dashed var(--border-subtle)',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderBottom = `1px solid var(--accent-${node.type === 'startNode' ? 'emerald' : node.type === 'endNode' ? 'rose' : 'violet'})`}
                onBlur={(e) => e.target.style.borderBottom = '1px dashed var(--border-subtle)'}
              />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Başlık</label>
              <input
                className="input"
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Görev başlığı"
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              {node.type === 'startNode' ? 'Başlangıç Kriterleri / Ön Koşullar' :
               node.type === 'endNode' ? 'Sonuçlandırma ve Çıktılar' :
               node.type === 'milestoneNode' ? 'Hedef Açıklaması' : 'Açıklama'}
            </label>
            <textarea
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detaylar..."
              rows={5}
              style={{
                border: (node.type === 'startNode' || node.type === 'endNode' || node.type === 'milestoneNode') ? '1px solid var(--border-subtle)' : undefined,
                boxShadow: 'none',
                background: 'var(--bg-primary)'
              }}
            />
          </div>

          {/* Standard Fields only for Task and Wiki */}
          {node.type !== 'startNode' && node.type !== 'endNode' && node.type !== 'milestoneNode' && (
            <>
              {node.type !== 'wikiNode' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
                  <div className="input-group">
                    <label className="input-label">Durum</label>
                    <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                      <option value="todo">Yapılacak</option>
                      <option value="in_progress">Devam Ediyor</option>
                      <option value="testing">Test Ediliyor</option>
                      <option value="done">Tamamlandı</option>
                      <option value="archived">Arşiv</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Öncelik</label>
                    <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                      {PRIORITY_OPTIONS.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {node.type !== 'wikiNode' && !isPersonalWorkspace && (
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Atanan Kişi
                    <button 
                      type="button"
                      onClick={() => setAssignToTree(!assignToTree)}
                      className={assignToTree ? "btn btn-primary btn-xs" : "btn btn-ghost btn-xs"} 
                      style={{ fontSize: '10px', padding: '2px 6px', height: 'auto', border: assignToTree ? 'none' : '1px solid var(--border-subtle)' }}
                      title="Aktif olduğunda bu kişiyi bu göreve ve alt görevlere atar"
                    >
                      Ağaca Ata
                    </button>
                  </label>
                  <select className="input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">Kimse atanmadı</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Etiketler</label>
                <input
                  className="input"
                  type="text"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  placeholder="frontend, bug, urgent (virgülle ayır)"
                />
              </div>
            </>
          )}
        </div>

        <div className="node-detail-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <Trash2 /> Sil
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save /> Kaydet
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
