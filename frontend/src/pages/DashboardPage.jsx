import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Folder, File, GitBranch, Edit2, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import useAuthStore from '../stores/authStore';
import useWorkspaceStore from '../stores/workspaceStore';
import useUIStore from '../stores/uiStore';
import CreateBoardModal from '../components/board/CreateBoardModal';
import EditBoardModal from '../components/board/EditBoardModal';
import EditProjectModal from '../components/workspace/EditProjectModal';
import toast from 'react-hot-toast';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  }),
};

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const navigate = useNavigate();

  // Workspace
  const { activeWorkspaceId, workspaces, projects, boards, isLoading, isContentLoading } = useWorkspaceStore();
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Board operations
  const deleteBoard = useWorkspaceStore(s => s.deleteBoard);
  const deleteProject = useWorkspaceStore(s => s.deleteProject);
  const { openCreateBoardModal, openCreateProjectModal, createBoardModalOpen, openConfirmModal } = useUIStore();
  
  const [editingBoard, setEditingBoard] = useState(null);
  const [editingProject, setEditingProject] = useState(null);

  if (isLoading || isContentLoading) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-block', marginBottom: 16, opacity: 0.5 }}>
            <Loader2 size={48} />
          </motion.div>
          <h2>Yükleniyor...</h2>
          <p>Çalışma alanınız hazırlanıyor, lütfen bekleyin.</p>
        </div>
      </div>
    );
  }

  if (!activeWorkspaceId) {
    return (
      <div className="dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <h2>Çalışma Alanı Seçilmedi</h2>
          <p>Lütfen sol menüden bir çalışma alanı seçin veya oluşturun.</p>
        </div>
      </div>
    );
  }

  const freeBoards = boards.filter(b => !b.project_id);

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
          toast.error('Board silinemedi: ' + err.message);
        }
      }
    });
  };

  const handleEditBoard = (e, board) => {
    e.stopPropagation();
    setEditingBoard(board);
  };

  const handleDeleteProject = (e, project) => {
    e.stopPropagation();
    openConfirmModal({
      title: 'Proje Silinecek',
      message: `"${project.name}" projesini ve içindeki tüm panoları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Projeyi Sil',
      onConfirm: async () => {
        try {
          await deleteProject(activeWorkspaceId, project.id);
          toast.success(`Klasör silindi`);
        } catch (err) {
          toast.error('Klasör silinemedi: ' + err.message);
        }
      }
    });
  };

  const handleEditProject = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
  };

  return (
    <div className="dashboard">
      <motion.div className="dashboard-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1>Merhaba, {user?.displayName} 👋</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{activeWorkspace?.name} çalışma alanındasınız.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-secondary" onClick={openCreateProjectModal}>
            <Folder size={16} /> Yeni Proje
          </button>
          <button className="btn btn-primary" onClick={openCreateBoardModal}>
            <Plus size={16} /> Yeni Pano
          </button>
        </div>
      </motion.div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Folder size={18} /> Projeler
          </div>
          <div className="board-grid">
            {projects.map((proj, i) => {
              const projBoards = boards.filter(b => b.project_id === proj.id);
              return (
                <motion.div
                  key={proj.id}
                  className="board-card"
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={() => navigate(`/project/${proj.id}`)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="board-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="board-card-name">
                      <Folder size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-3px' }}/> {proj.name}
                    </div>
                    <div className="board-card-actions" style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={(e) => handleEditProject(e, proj)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={(e) => handleDeleteProject(e, proj)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '4px' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="board-card-desc">{projBoards.length} pano içeriyor</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Free Boards */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <File size={18} /> Görev Panoları
        </div>
        <div className="board-grid">
          {freeBoards.map((board, i) => (
            <motion.div
              key={board.id}
              className="board-card"
              custom={i + projects.length}
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

          {/* Create new board card */}
          <motion.div
            className="create-board-card"
            custom={freeBoards.length + projects.length}
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

      {createBoardModalOpen && <CreateBoardModal />}
      {editingBoard && <EditBoardModal board={editingBoard} onClose={() => setEditingBoard(null)} />}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />}
    </div>
  );
}
