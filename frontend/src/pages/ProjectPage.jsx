import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, File, Edit2, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useWorkspaceStore from '../stores/workspaceStore';
import useUIStore from '../stores/uiStore';
import CreateBoardModal from '../components/board/CreateBoardModal';
import EditBoardModal from '../components/board/EditBoardModal';
import toast from 'react-hot-toast';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  }),
};

export default function ProjectPage() {
  const { projectId } = useParams();
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  // Workspace
  const { activeWorkspaceId, workspaces, projects, boards, isLoading, isContentLoading } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const project = projects.find(p => p.id === projectId);

  // Board operations
  const deleteBoard = useWorkspaceStore(s => s.deleteBoard);
  const { openCreateBoardModal, createBoardModalOpen, openConfirmModal } = useUIStore();
  
  const [editingBoard, setEditingBoard] = useState(null);

  if (isLoading || isContentLoading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16, opacity: 0.5 }}>
            <Loader2 size={48} />
          </motion.div>
          <h2>Yükleniyor...</h2>
          <p>Proje bilgileri hazırlanıyor, lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (!activeWorkspaceId || !project) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h2>Proje Bulunamadı</h2>
          <p>Proje silinmiş olabilir veya erişiminiz yok.</p>
        </div>
      </div>
    );
  }

  const projBoards = boards.filter(b => b.project_id === projectId);

  const handleDeleteBoard = (e, board) => {
    e.stopPropagation();
    openConfirmModal({
      title: 'Pano Silinecek',
      message: `"${board.name}" panosunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Sil',
      onConfirm: async () => {
        try {
          await deleteBoard(activeWorkspaceId, board.id);
          toast.success(`"${board.name}" silindi`);
        } catch (err) {
          toast.error('Pano silinemedi: ' + err.message);
        }
      }
    });
  };

  const handleEditBoard = (e, board) => {
    e.stopPropagation();
    setEditingBoard(board);
  };

  return (
    <div className="dashboard">
      <motion.div className="dashboard-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={28} /> {project.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {activeWorkspace?.name} çalışma alanındaki bir projedesiniz.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-primary" onClick={openCreateBoardModal}>
            <Plus size={16} /> Yeni Pano
          </button>
        </div>
      </motion.div>

      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <File size={18} /> İçindeki Panolar
        </div>
        <div className="board-grid">
          {projBoards.map((board, i) => (
            <motion.div
              key={board.id}
              className="board-card"
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onClick={() => navigate(`/board/${board.id}`)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="board-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="board-card-name"><File size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-3px' }}/> {board.name}</div>
                <div className="board-card-actions" style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={(e) => handleEditBoard(e, board)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => handleDeleteBoard(e, board)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="board-card-desc">{board.description || 'Açıklama yok'}</div>
            </motion.div>
          ))}

          <motion.div
            className="create-board-card"
            custom={projBoards.length}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            onClick={openCreateBoardModal}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus />
            <span>Yeni Pano Oluştur</span>
          </motion.div>
        </div>
      </div>

      {createBoardModalOpen && <CreateBoardModal initialProjectId={projectId} />}
      {editingBoard && <EditBoardModal board={editingBoard} onClose={() => setEditingBoard(null)} />}
    </div>
  );
}
