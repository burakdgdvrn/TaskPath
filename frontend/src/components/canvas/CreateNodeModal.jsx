import { useState } from 'react';
import { X, CheckSquare, FileText, Target, PlayCircle, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useBoardStore from '../../stores/boardStore';
import useUIStore from '../../stores/uiStore';
import useAuthStore from '../../stores/authStore';
import toast from 'react-hot-toast';

export default function CreateNodeModal({ boardId, broadcast }) {
  const addNode = useBoardStore(s => s.addNode);
  const closeModal = useUIStore(s => s.closeCreateNodeModal);
  const newNodePosition = useUIStore(s => s.newNodePosition);
  const user = useAuthStore(s => s.user);

  const [hoveredIdx, setHoveredIdx] = useState(null);

  const handleSelect = async (typeInfo) => {
    try {
      const createdNode = await addNode(boardId, {
        label: typeInfo.defaultLabel,
        description: "",
        priority: "medium",
        nodeType: typeInfo.type,
        assignedTo: user.id,
        position: newNodePosition || { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      });
      broadcast?.('node:create', { node_id: createdNode.id });
      toast.success(`${typeInfo.defaultLabel} eklendi`);
      closeModal();
    } catch (err) {
      toast.error('Oluşturulamadı');
    }
  };

  const NODE_OPTIONS = [
    { type: 'taskNode', icon: CheckSquare, title: 'Görev', defaultLabel: 'Yeni Görev', desc: 'Standart iş parçası', color: 'var(--accent-blue)' },
    { type: 'wikiNode', icon: FileText, title: 'Not (Wiki)', defaultLabel: 'Yeni Not', desc: 'Bilgi ve belgeler', color: 'var(--accent-emerald)' },
    { type: 'milestoneNode', icon: Target, title: 'Milestone', defaultLabel: 'Stratejik Hedef', desc: 'İlerleme takibi', color: 'var(--accent-violet)' },
    { type: 'startNode', icon: PlayCircle, title: 'Başlangıç', defaultLabel: 'Faz Başlangıcı', desc: 'Sürecin ilk adımı', color: 'var(--accent-emerald)' },
    { type: 'endNode', icon: Flag, title: 'Bitiş', defaultLabel: 'Faz Tamamlanma', desc: 'Sürecin son adımı', color: 'var(--accent-rose)' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
      >
        <motion.div
          style={{ 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--border-subtle)', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
            width: '90%', 
            maxWidth: '640px',
            borderRadius: '24px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column'
          }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Yeni Hücre Ekle</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>Panoya yerleştirmek istediğiniz hücre türünü seçin.</p>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={closeModal} style={{ borderRadius: '50%' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '20px' 
          }}>
            {NODE_OPTIONS.map((opt, idx) => {
              const Icon = opt.icon;
              const isHovered = hoveredIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 16px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isHovered ? opt.color : 'var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    boxShadow: isHovered ? `0 8px 25px -5px ${opt.color}40` : 'none',
                    transform: isHovered ? 'translateY(-4px)' : 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    outline: 'none',
                    color: 'inherit',
                    fontFamily: 'inherit'
                  }}
                >
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginBottom: '16px',
                    background: isHovered ? `${opt.color}20` : 'var(--bg-elevated)',
                    color: opt.color,
                    transition: 'all 0.3s ease',
                    transform: isHovered ? 'scale(1.1)' : 'none'
                  }}>
                    <Icon size={32} strokeWidth={1.5} />
                  </div>
                  <h3 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', fontSize: '15px', margin: 0 }}>{opt.title}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: '4px 0 0 0', lineHeight: 1.4 }}>{opt.desc}</p>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
