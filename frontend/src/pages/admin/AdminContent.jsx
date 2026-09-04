import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiAdminGetContentTree, apiAdminDeleteWorkspace, apiAdminDeleteProject, apiAdminDeleteBoard } from '../../services/api';
import useUIStore from '../../stores/uiStore';
import { Trash2, Briefcase, Folder, FileType, ChevronDown, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminContent() {
  const navigate = useNavigate();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const openConfirmModal = useUIStore(s => s.openConfirmModal);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});

  async function loadContent() {
    try {
      const data = await apiAdminGetContentTree();
      setContent(data);
      // Auto-expand first few
      const initialWs = {};
      data.slice(0, 5).forEach(w => initialWs[w.id] = true);
      setExpandedWorkspaces(initialWs);
    } catch (err) {
      toast.error('İçerikler yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContent();
  }, []);

  const toggleWs = (id) => setExpandedWorkspaces(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleProj = (id) => setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));

  const handleDelete = (type, id, name) => {
    let apiCall;
    let title;
    if (type === 'workspace') {
      apiCall = apiAdminDeleteWorkspace;
      title = 'Çalışma Alanını Sil';
    } else if (type === 'project') {
      apiCall = apiAdminDeleteProject;
      title = 'Projeyi Sil';
    } else if (type === 'board') {
      apiCall = apiAdminDeleteBoard;
      title = 'Panoyu Sil';
    }

    openConfirmModal({
      title,
      message: `"${name}" öğesini ve içindeki tüm verileri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      onConfirm: async () => {
        try {
          await apiCall(id);
          toast.success(`${name} başarıyla silindi.`);
          loadContent(); // Reload tree
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-xl)', color: 'var(--text-primary)' }}>
        İçerik Yönetimi
      </h1>
      
      {content.length === 0 && (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          Sistemde henüz hiçbir içerik bulunmuyor.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {content.map(ws => (
          <div key={ws.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {/* Workspace Header */}
            <div 
              style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-md)', cursor: 'pointer', background: expandedWorkspaces[ws.id] ? 'var(--bg-tertiary)' : 'transparent' }}
              onClick={() => toggleWs(ws.id)}
            >
              <div style={{ marginRight: 'var(--space-sm)', color: 'var(--text-muted)' }}>
                {expandedWorkspaces[ws.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
              <Briefcase size={20} style={{ color: 'var(--accent-teal)', marginRight: 'var(--space-md)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)', fontSize: 'var(--font-md)' }}>{ws.name}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <User size={12} /> {ws.owner ? `${ws.owner.display_name} (@${ws.owner.username})` : 'Bilinmeyen Kullanıcı'}
                  <span style={{ margin: '0 4px' }}>•</span>
                  Oluşturulma: {new Date(ws.created_at).toLocaleDateString('tr-TR')}
                </div>
              </div>
              <button 
                className="btn btn-ghost btn-sm" 
                style={{ color: 'var(--accent-red)' }}
                title="Çalışma Alanını Sil"
                onClick={(e) => { e.stopPropagation(); handleDelete('workspace', ws.id, ws.name); }}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Workspace Content */}
            {expandedWorkspaces[ws.id] && (
              <div style={{ padding: '0 var(--space-md) var(--space-md) 44px' }}>
                {ws.projects.length === 0 && ws.boards_without_project.length === 0 && (
                  <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', padding: 'var(--space-sm) 0' }}>Bu çalışma alanında proje veya pano yok.</div>
                )}

                {/* Projects */}
                {ws.projects.map(proj => (
                  <div key={proj.id} style={{ marginTop: 'var(--space-sm)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-sm) var(--space-md)', cursor: 'pointer', borderBottom: expandedProjects[proj.id] && proj.boards.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}
                      onClick={() => toggleProj(proj.id)}
                    >
                      <div style={{ marginRight: 'var(--space-xs)', color: 'var(--text-muted)' }}>
                        {expandedProjects[proj.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      <Folder size={16} style={{ color: 'var(--accent-rose)', marginRight: 'var(--space-sm)' }} />
                      <div style={{ flex: 1, fontSize: 'var(--font-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>
                        {proj.name}
                      </div>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        style={{ color: 'var(--accent-red)', padding: 4, height: 'auto' }}
                        title="Projeyi Sil"
                        onClick={(e) => { e.stopPropagation(); handleDelete('project', proj.id, proj.name); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    {/* Project Boards */}
                    {expandedProjects[proj.id] && proj.boards.length > 0 && (
                      <div style={{ padding: 'var(--space-xs) 0', background: 'var(--bg-tertiary)' }}>
                        {proj.boards.map(b => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '6px var(--space-md) 6px 40px', cursor: 'pointer' }} onClick={() => navigate(`/board/${b.id}`)}>
                            <FileType size={14} style={{ color: 'var(--accent-amber)', marginRight: 'var(--space-sm)' }} />
                            <div style={{ flex: 1, fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }} className="hover-underline">{b.name}</div>
                            <button 
                              className="btn btn-ghost btn-sm" 
                              style={{ color: 'var(--accent-red)', padding: 2, height: 'auto' }}
                              title="Panoyu Sil"
                              onClick={(e) => { e.stopPropagation(); handleDelete('board', b.id, b.name); }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {expandedProjects[proj.id] && proj.boards.length === 0 && (
                      <div style={{ padding: 'var(--space-xs) var(--space-md) var(--space-xs) 40px', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', background: 'var(--bg-tertiary)' }}>
                        Bu projede pano yok.
                      </div>
                    )}
                  </div>
                ))}

                {/* Independent Boards */}
                {ws.boards_without_project.length > 0 && (
                  <div style={{ marginTop: 'var(--space-md)' }}>
                    <div style={{ fontSize: 'var(--font-xs)', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-xs)', letterSpacing: 1 }}>Bağımsız Panolar</div>
                    {ws.boards_without_project.map(b => (
                      <div key={b.id} style={{ display: 'flex', alignItems: 'center', padding: '8px var(--space-md)', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '4px', cursor: 'pointer' }} onClick={() => navigate(`/board/${b.id}`)}>
                        <FileType size={16} style={{ color: 'var(--accent-amber)', marginRight: 'var(--space-sm)' }} />
                        <div style={{ flex: 1, fontSize: 'var(--font-sm)', color: 'var(--text-primary)' }} className="hover-underline">{b.name}</div>
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--accent-red)', padding: 4, height: 'auto' }}
                          title="Panoyu Sil"
                          onClick={(e) => { e.stopPropagation(); handleDelete('board', b.id, b.name); }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
