import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { 
  GitBranch, Home, Plus, LogOut, Settings, Sun, Moon, 
  Folder, File, ChevronDown, ChevronRight, Inbox, UserPlus, Briefcase, MoreHorizontal, Edit2, Trash2, Users, MessageCircle, Shield
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useUIStore from '../../stores/uiStore';
import EditProjectModal from '../workspace/EditProjectModal';
import EditWorkspaceModal from '../workspace/EditWorkspaceModal';
import WorkspaceMembersModal from '../workspace/WorkspaceMembersModal';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();

  // Workspace state
  const { 
    workspaces, activeWorkspaceId, projects, boards, invites, notifications, isLoading, isContentLoading,
    fetchWorkspaces, setActiveWorkspace, fetchInvites, fetchNotifications, deleteWorkspace 
  } = useWorkspaceStore();

  // UI state
  const {
    theme, toggleTheme, openProfileModal,
    openCreateWorkspaceModal, openCreateProjectModal, 
    openInviteMemberModal, openInboxModal, openConfirmModal,
    toggleChat, unreadChatCounts, incrementUnreadChat,
    setSidebarOpen
  } = useUIStore();
  const openCreateBoardModal = useUIStore(s => s.openCreateBoardModal); // this one handles generic modal

  const handleMobileClose = () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      setSidebarOpen(false);
    }
  };

  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [contextMenu, setContextMenu] = useState(null); // { projectId, x, y }

  // Modals for editing project (already in uiStore?)
  const [editingProject, setEditingProject] = useState(null);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [managingMembersWorkspace, setManagingMembersWorkspace] = useState(null);

  useEffect(() => {
    fetchWorkspaces();
    fetchInvites();
    fetchNotifications();
  }, [fetchWorkspaces, fetchInvites, fetchNotifications]);

  useEffect(() => {
    const handleWsMessage = (e) => {
      const data = e.detail;
      if (data?.type === 'chat:receive' && data.message) {
        const msg = data.message;
        const chatId = msg.workspace_id ? msg.workspace_id : (msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id);
        if (chatId) incrementUnreadChat(chatId);
      } else if (data?.type === 'friend:request' || data?.type === 'friend:accepted') {
        incrementUnreadChat('friends');
      }
    };
    window.addEventListener('ws:message', handleWsMessage);
    return () => window.removeEventListener('ws:message', handleWsMessage);
  }, [incrementUnreadChat, user?.id]);

  const unreadCount = invites.length + (notifications || []).filter(n => !n.is_read).length;
  const totalUnreadChat = Object.values(unreadChatCounts || {}).reduce((a, b) => a + b, 0);

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const freeBoards = boards.filter(b => !b.project_id);

  const handleContextMenu = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ projectId, x: e.clientX, y: e.clientY });
  };

  const handleThreeDotsClick = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({ projectId, x: rect.left, y: rect.bottom });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Close context menu on any outside click
  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sidebar">
      {/* Workspace Switcher */}
      <div className="sidebar-header" style={{ cursor: 'pointer', padding: 'var(--space-md)' }} onClick={() => setWsDropdownOpen(!wsDropdownOpen)}>
        <div className="sidebar-logo">
          <Briefcase size={20} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Çalışma Alanı</span>
          <span className="sidebar-title" style={{ fontSize: 'var(--font-sm)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {activeWorkspace ? activeWorkspace.name : (isLoading ? 'Yükleniyor...' : 'Çalışma Alanı Yok')}
          </span>
        </div>
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: wsDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </div>

      {wsDropdownOpen && (
        <div style={{ padding: '0 var(--space-md) var(--space-md)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-xs)', border: '1px solid var(--border-subtle)' }}>
            {workspaces.map(ws => (
              <button 
                key={ws.id} 
                className="btn btn-ghost" 
                style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)', color: ws.id === activeWorkspaceId ? 'var(--accent)' : 'inherit' }}
                onClick={() => { setActiveWorkspace(ws.id); setWsDropdownOpen(false); navigate('/dashboard'); handleMobileClose(); }}
              >
                {ws.name}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-xs) 0' }} />
            <button 
              className="btn btn-ghost" 
              style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)' }}
              onClick={() => { openCreateWorkspaceModal(); setWsDropdownOpen(false); }}
            >
              <Plus size={14} style={{ marginRight: 6 }} /> Yeni Alan Oluştur
            </button>
            {activeWorkspace && activeWorkspace.owner_id === user?.id && (
              <>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)' }}
                  onClick={() => { setEditingWorkspace(activeWorkspace); setWsDropdownOpen(false); }}
                >
                  <Edit2 size={14} style={{ marginRight: 6 }} /> Alanı Düzenle
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)' }}
                  onClick={() => { setManagingMembersWorkspace(activeWorkspace); setWsDropdownOpen(false); }}
                >
                  <Users size={14} style={{ marginRight: 6 }} /> Üyeleri Yönet
                </button>
                <button 
                  className="btn btn-ghost" 
                  style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)', color: 'var(--accent-red)' }}
                  onClick={() => {
                    setWsDropdownOpen(false);
                    openConfirmModal({
                      title: 'Çalışma Alanı Silinecek',
                      message: `"${activeWorkspace.name}" alanını silmek istediğinize emin misiniz? Tüm projeler ve panolar kalıcı olarak silinir!`,
                      confirmText: 'Alanı Sil',
                      onConfirm: async () => {
                        try {
                          await deleteWorkspace(activeWorkspace.id);
                          toast.success('Alan silindi');
                          navigate('/dashboard');
                          handleMobileClose();
                        } catch (e) {
                          toast.error(e.message || 'Silinemedi');
                        }
                      }
                    });
                  }}
                >
                  <Trash2 size={14} style={{ marginRight: 6 }} /> Alanı Sil
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <ul className="sidebar-nav">
          <li>
            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleMobileClose}>
              <Home size={20} />
              <span style={{ fontSize: 'var(--font-base)', fontWeight: 'var(--fw-semi)' }}>Ana Sayfa</span>
            </NavLink>
          </li>
        </ul>

        {activeWorkspace && (
          <div style={{ marginTop: 'var(--space-lg)' }}>
            <div className="sidebar-section-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>PROJELER</span>
              <button className="btn btn-icon btn-ghost btn-sm" onClick={() => { openCreateProjectModal(); handleMobileClose(); }} style={{ width: 20, height: 20 }} title="Yeni Proje"><Plus size={14} /></button>
            </div>
            <ul className="sidebar-nav" style={{ paddingLeft: 'var(--space-xs)' }}>
              {isContentLoading ? (
                <li style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  Projeler yükleniyor...
                </li>
              ) : projects.length === 0 ? (
                <li style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  Henüz proje yok
                </li>
              ) : (
                projects.map(proj => {
                  const projBoards = boards.filter(b => b.project_id === proj.id);
                  const isExpanded = expandedProjects[proj.id];
                  return (
                    <li key={proj.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div 
                        className="sidebar-nav-item" 
                        style={{ cursor: 'pointer', paddingLeft: 'var(--space-xs)', position: 'relative' }}
                        onClick={() => {
                          toggleProject(proj.id);
                          navigate(`/project/${proj.id}`);
                          handleMobileClose();
                        }}
                        onContextMenu={(e) => handleContextMenu(e, proj.id)}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Folder size={16} />
                        <span style={{ flex: 1 }}>{proj.name}</span>
                        <button 
                          className="btn btn-ghost btn-icon btn-sm" 
                          style={{ width: 20, height: 20, opacity: 0.6 }} 
                          onClick={(e) => handleThreeDotsClick(e, proj.id)}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {isExpanded && (
                        <ul style={{ listStyle: 'none', paddingLeft: 'var(--space-lg)', margin: 0 }}>
                          {projBoards.length === 0 && (
                            <li style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', padding: 'var(--space-xs) 0' }}>Boş proje</li>
                          )}
                          {projBoards.map(board => (
                            <li key={board.id}>
                              <NavLink to={`/board/${board.id}`} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} style={{ paddingLeft: 'var(--space-xs)', minHeight: 32 }} onClick={handleMobileClose}>
                                <File size={14} />
                                <span>{board.name}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })
              )}
            </ul>

            <div className="sidebar-section-label" style={{ marginTop: 'var(--space-md)' }}>
              GÖREV PANOLARI
            </div>
            <ul className="sidebar-nav">
              {isContentLoading ? (
                <li style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                  Panolar yükleniyor...
                </li>
              ) : (
                <>
                  {freeBoards.length === 0 && (
                    <li style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', padding: 'var(--space-sm)', textAlign: 'center' }}>
                      Henüz pano yok
                    </li>
                  )}
                  {freeBoards.map(board => (
                    <li key={board.id}>
                      <NavLink to={`/board/${board.id}`} className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleMobileClose}>
                        <File size={16} />
                        <span>{board.name}</span>
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <button className="sidebar-nav-item" onClick={() => { openCreateBoardModal(); handleMobileClose(); }} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', color: 'var(--text-muted)' }}>
                      <Plus size={16} />
                      <span>Yeni Pano</span>
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        
        {/* Workspace Actions */}
        {activeWorkspace && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setManagingMembersWorkspace(activeWorkspace)}>
              <Users size={14} /> Üyeler
            </button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1, position: 'relative' }} onClick={openInboxModal}>
              <Inbox size={14} /> Gelen 
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, background: 'var(--error)', color: 'var(--badge-text)', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {user?.isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={handleMobileClose} style={{ width: '100%', marginBottom: 'var(--space-xs)', textDecoration: 'none' }}>
            <Shield size={18} />
            <span>Admin Paneli</span>
          </NavLink>
        )}

        <button className="sidebar-nav-item" onClick={() => { toggleChat(); handleMobileClose(); }} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-xs)', position: 'relative' }}>
          <MessageCircle size={18} />
          <span>Sohbetler</span>
          {totalUnreadChat > 0 && (
            <span style={{ position: 'absolute', right: 16, background: 'var(--accent-rose)', color: 'white', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', fontWeight: 'bold' }}>
              {totalUnreadChat}
            </span>
          )}
        </button>

        <button className="sidebar-nav-item" onClick={() => { toggleTheme(); handleMobileClose(); }} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-xs)' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}</span>
        </button>

        <button className="sidebar-nav-item" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-md)' }}>
          <LogOut size={18} />
          <span>Çıkış Yap</span>
        </button>

        <div className="sidebar-user" onClick={() => { openProfileModal(); handleMobileClose(); }} title="Profil Ayarları">
          <div className="sidebar-avatar" style={{ 
            background: user?.avatar_base64 ? `url(${user.avatar_base64}) center/cover` : (user?.avatarColor || '#8b5cf6'),
            border: user?.avatar_base64 ? '1px solid var(--border-subtle)' : 'none'
          }}>
            {!user?.avatar_base64 && user?.displayName?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.displayName}</span>
            <span className="sidebar-user-email">{user?.username}</span>
          </div>
          <Settings style={{ width: 16, height: 16, color: 'var(--text-muted)', marginLeft: 'auto' }} />
        </div>
      </div>

      {contextMenu && (
        <div 
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-xs)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 150
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)' }}
            onClick={() => {
              // Edit project -> this needs EditProjectModal rendered, we'll dispatch it
              setEditingProject(projects.find(p => p.id === contextMenu.projectId));
              closeContextMenu();
            }}
          >
            <Edit2 size={14} style={{ marginRight: 6 }} /> İsim Değiştir
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ width: '100%', justifyContent: 'flex-start', padding: 'var(--space-xs) var(--space-sm)' }}
            onClick={() => {
              navigate(`/project/${contextMenu.projectId}`);
              openCreateBoardModal();
              closeContextMenu();
            }}
          >
            <Plus size={14} style={{ marginRight: 6 }} /> Yeni Pano
          </button>
        </div>
      )}

      {/* Import this inside the component or at top? Let's just import at top and render here */}
      {editingProject && <EditProjectModal project={editingProject} onClose={() => setEditingProject(null)} />}
      {editingWorkspace && <EditWorkspaceModal workspace={editingWorkspace} onClose={() => setEditingWorkspace(null)} />}
      {managingMembersWorkspace && <WorkspaceMembersModal workspace={managingMembersWorkspace} onClose={() => setManagingMembersWorkspace(null)} />}
    </nav>
  );
}
