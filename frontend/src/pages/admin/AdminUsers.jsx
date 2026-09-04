import { useState, useEffect } from 'react';
import { apiAdminGetUsers, apiAdminToggleUserRole, apiAdminDeleteUser } from '../../services/api';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import { Shield, ShieldAlert, Trash2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore(s => s.user);
  const openConfirmModal = useUIStore(s => s.openConfirmModal);

  async function loadUsers() {
    try {
      const data = await apiAdminGetUsers();
      setUsers(data);
    } catch (err) {
      toast.error('Kullanıcılar yüklenemedi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (userId) => {
    if (userId === currentUser.id) {
      toast.error('Kendi yetkinizi değiştiremezsiniz.');
      return;
    }
    
    try {
      const res = await apiAdminToggleUserRole(userId);
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: res.is_admin } : u));
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = (user) => {
    if (user.id === currentUser.id) {
      toast.error('Kendi hesabınızı buradan silemezsiniz.');
      return;
    }

    openConfirmModal({
      title: 'Kullanıcıyı Sil',
      message: `"${user.username}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      confirmText: 'Evet, Sil',
      onConfirm: async () => {
        try {
          await apiAdminDeleteUser(user.id);
          setUsers(users.filter(u => u.id !== user.id));
          toast.success('Kullanıcı silindi.');
        } catch (err) {
          toast.error(err.message);
        }
      }
    });
  };

  const handleResetPassword = async (user) => {
    const newPassword = prompt(`"${user.username}" kullanıcısı için yeni şifre girin:`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    try {
      const { apiAdminResetUserPassword } = await import('../../services/api');
      const res = await apiAdminResetUserPassword(user.id, newPassword);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-xl)', color: 'var(--text-primary)' }}>
        Kullanıcı Yönetimi
      </h1>

      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--font-sm)' }}>Kullanıcı Adı</th>
              <th style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--font-sm)' }}>E-posta</th>
              <th style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--font-sm)' }}>Rol</th>
              <th style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--font-sm)' }}>Kayıt Tarihi</th>
              <th style={{ padding: 'var(--space-md)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--font-sm)' }}>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: u.avatar_base64 ? `url(${u.avatar_base64}) center/cover` : (u.avatar_color || '#8b5cf6'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 'bold'
                    }}>
                      {!u.avatar_base64 && u.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)' }}>{u.display_name}</div>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                  {u.email}
                </td>
                <td style={{ padding: 'var(--space-md)' }}>
                  {u.is_admin ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb, var(--accent-rose) 20%, transparent)', color: 'var(--accent-rose)', padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-xs)', fontWeight: 'bold' }}>
                      <Shield size={12} /> Admin
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 12, fontSize: 'var(--font-xs)' }}>
                      Kullanıcı
                    </span>
                  )}
                </td>
                <td style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)' }}>
                  {new Date(u.created_at).toLocaleDateString('tr-TR')}
                </td>
                <td style={{ padding: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: u.is_admin ? 'var(--accent-rose)' : 'var(--text-muted)' }}
                      title={u.is_admin ? "Admin Yetkisini Al" : "Admin Yetkisi Ver"}
                      onClick={() => handleToggleRole(u.id)}
                      disabled={u.id === currentUser.id}
                    >
                      {u.is_admin ? <ShieldAlert size={16} /> : <Shield size={16} />}
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: 'var(--accent)' }}
                      title="Şifreyi Sıfırla"
                      onClick={() => handleResetPassword(u)}
                    >
                      <Key size={16} />
                    </button>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: 'var(--accent-red)' }}
                      title="Kullanıcıyı Sil"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser.id}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
            Henüz kullanıcı yok.
          </div>
        )}
      </div>
    </div>
  );
}
