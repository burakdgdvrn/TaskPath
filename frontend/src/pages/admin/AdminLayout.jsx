import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Shield, Users, LogOut, ArrowLeft, Briefcase } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import ProfileSettingsModal from '../../components/profile/ProfileSettingsModal';

export default function AdminLayout() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const profileModalOpen = useUIStore(s => s.profileModalOpen);
  const openProfileModal = useUIStore(s => s.openProfileModal);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Admin Sidebar */}
      <nav className="sidebar" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-subtle)' }}>
        <div className="sidebar-header" style={{ padding: 'var(--space-md)' }}>
          <div className="sidebar-logo">
            <Shield size={20} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--accent-rose)' }}>Yönetim Paneli</span>
            <span className="sidebar-title" style={{ fontSize: 'var(--font-sm)' }}>
              TaskPath Admin
            </span>
          </div>
        </div>

        <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto', marginTop: 'var(--space-md)' }}>
          <ul className="sidebar-nav">
            <li>
              <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Shield size={18} />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/content" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Briefcase size={18} />
                <span>İçerikler</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} />
                <span>Kullanıcılar</span>
              </NavLink>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-nav-item" onClick={() => navigate('/dashboard')} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-xs)' }}>
            <ArrowLeft size={18} />
            <span>Uygulamaya Dön</span>
          </button>
          
          <button className="sidebar-nav-item" onClick={handleLogout} style={{ width: '100%', border: 'none', background: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-md)' }}>
            <LogOut size={18} />
            <span>Çıkış Yap</span>
          </button>

          <div className="sidebar-user" onClick={() => openProfileModal()} title="Profil Ayarları">
            <div className="sidebar-avatar" style={{ 
              background: user?.avatar_base64 ? `url(${user.avatar_base64}) center/cover` : (user?.avatarColor || '#f43f5e'),
              border: user?.avatar_base64 ? '1px solid var(--border-subtle)' : 'none'
            }}>
              {!user?.avatar_base64 && user?.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.displayName}</span>
              <span className="sidebar-user-email">{user?.username}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="app-main" style={{ background: 'var(--bg-primary)' }}>
        <div className="app-content" style={{ padding: 'var(--space-xl)' }}>
          <Outlet />
        </div>
      </div>

      {profileModalOpen && <ProfileSettingsModal />}
    </div>
  );
}
