import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, User as UserIcon, Mail, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import { apiUpdateProfile, apiUpdatePassword, apiDeleteAccount } from '../../services/api';
import toast from 'react-hot-toast';

export default function ProfileSettingsModal() {
  const user = useAuthStore(s => s.user);
  const updateLocalUser = useAuthStore(s => s.updateLocalUser);
  const logout = useAuthStore(s => s.logout);
  const closeModal = useUIStore(s => s.closeProfileModal);

  // Profile Form
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarBase64, setAvatarBase64] = useState(user?.avatar_base64 || null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const fileInputRef = useRef(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Delete Account Form
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    
    setIsUpdatingProfile(true);
    try {
      const data = await apiUpdateProfile({ 
        display_name: displayName.trim(),
        avatar_base64: avatarBase64 
      });
      updateLocalUser({ 
        displayName: data.display_name,
        avatar_base64: data.avatar_base64 
      });
      toast.success('Profil bilgileri güncellendi');
    } catch (err) {
      toast.error(err.message || 'Profil güncellenemedi');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Lütfen geçerli bir resim dosyası seçin');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setAvatarBase64(dataUrl);

        // Auto-save the avatar immediately
        setIsUpdatingProfile(true);
        apiUpdateProfile({ 
          display_name: displayName.trim(),
          avatar_base64: dataUrl 
        }).then((data) => {
          updateLocalUser({ 
            displayName: data.display_name,
            avatar_base64: data.avatar_base64 
          });
          toast.success('Profil fotoğrafı güncellendi');
        }).catch(err => {
          toast.error(err.message || 'Fotoğraf güncellenemedi');
        }).finally(() => {
          setIsUpdatingProfile(false);
        });

      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const data = await apiUpdatePassword(currentPassword, newPassword, confirmPassword);
      toast.success(data.message || 'Şifreniz başarıyla güncellendi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Şifre güncellenemedi');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (!deletePassword) {
      setDeleteError('Lütfen şifrenizi girin.');
      return;
    }

    setIsDeleting(true);
    try {
      await apiDeleteAccount(deletePassword);
      toast.success('Hesabınız başarıyla silindi');
      closeModal();
      logout();
    } catch (err) {
      setDeleteError(err.message || 'Şifre hatalı veya hesap silinemedi.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyId = () => {
    if (user?.username) {
      navigator.clipboard.writeText(user.username);
      toast.success('ID kopyalandı!');
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
      >
        <motion.div
          className="modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.4 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="modal-title">Profil Ayarları</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeModal}>
              <X />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2xl)' }}>
            
            {/* Profile Info Section */}
            <section>
              <h3 style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>Kişisel Bilgiler</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <div 
                  style={{ 
                    width: 80, 
                    height: 80, 
                    minWidth: 80,
                    minHeight: 80,
                    borderRadius: '40px', 
                    background: avatarBase64 ? `url(${avatarBase64}) center/cover no-repeat` : (user?.avatarColor || 'var(--accent-primary)'), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: 'white', 
                    fontSize: '32px', 
                    fontWeight: 600,
                    position: 'relative',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Fotoğrafı Değiştir"
                >
                  {!avatarBase64 && (user?.displayName?.charAt(0).toUpperCase() || 'U')}
                  <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--bg-secondary)', borderRadius: '50%', padding: 6, border: '2px solid var(--bg-card)', color: 'var(--text-primary)' }}>
                    <Camera size={14} />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="email-input">E-posta (Değiştirilemez)</label>
                  <div style={{ position: 'relative' }}>
                    <Mail style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      id="email-input"
                      className="input"
                      type="text"
                      value={user?.email || ''}
                      disabled
                      style={{ paddingLeft: 40, opacity: 0.7 }}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="username-input">Kullanıcı Adı / Benzersiz ID (Değiştirilemez)</label>
                  <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <UserIcon style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                      <input
                        id="username-input"
                        className="input"
                        type="text"
                        value={user?.username || ''}
                        disabled
                        style={{ paddingLeft: 40, opacity: 0.7, width: '100%' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleCopyId}
                      className="btn btn-secondary btn-sm"
                      title="ID Kopyala"
                    >
                      Kopyala
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="name-input">Görüntülenen Ad</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      id="name-input"
                      className="input"
                      type="text"
                      placeholder="Adınız"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      style={{ paddingLeft: 40 }}
                      required
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm"
                    disabled={isUpdatingProfile || displayName.trim() === user?.displayName}
                  >
                    {isUpdatingProfile ? 'Kaydediliyor...' : 'Adı Güncelle'}
                  </button>
                </div>
              </form>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* Password Section */}
            <section>
              <h3 style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>Şifre Değiştir</h3>
              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div className="input-group">
                  <label className="input-label" htmlFor="current-pwd">Mevcut Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      id="current-pwd"
                      className="input"
                      type="password"
                      placeholder="Mevcut şifreniz"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      style={{ paddingLeft: 40 }}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="new-pwd">Yeni Şifre</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      id="new-pwd"
                      className="input"
                      type="password"
                      placeholder="En az 6 karakter"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      style={{ paddingLeft: 40 }}
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="confirm-pwd">Yeni Şifre (Tekrar)</label>
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      id="confirm-pwd"
                      className="input"
                      type="password"
                      placeholder="Yeni şifrenizi tekrar girin"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      style={{ paddingLeft: 40 }}
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-xs)' }}>
                  <button 
                    type="submit" 
                    className="btn btn-secondary btn-sm"
                    disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                  >
                    {isUpdatingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                  </button>
                </div>
              </form>
            </section>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)' }} />

            {/* Delete Account Section */}
            <section>
              <h3 style={{ fontSize: 'var(--font-sm)', color: '#ef4444', textTransform: 'uppercase', marginBottom: 'var(--space-md)' }}>Hesabı Sil</h3>
              <form onSubmit={handleDeleteAccount} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', padding: 'var(--space-md)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  Hesabınızı silmek kalıcı bir işlemdir. Size ait çalışma alanları ve içindeki veriler silinecektir. Lütfen onaylamak için şifrenizi girin.
                </p>
                <div className="input-group">
                  <div style={{ position: 'relative' }}>
                    <Lock style={{ position: 'absolute', left: 12, top: 10, width: 18, height: 18, color: 'var(--text-muted)' }} />
                    <input
                      className="input"
                      type="password"
                      placeholder="Şifreniz"
                      value={deletePassword}
                      onChange={e => {
                        setDeletePassword(e.target.value);
                        if (deleteError) setDeleteError('');
                      }}
                      style={{ paddingLeft: 40, borderColor: deleteError ? '#ef4444' : 'rgba(239, 68, 68, 0.3)' }}
                      required
                    />
                  </div>
                  {deleteError && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {deleteError}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="btn btn-sm"
                    style={{ background: '#ef4444', color: 'white', border: 'none' }}
                    disabled={isDeleting || !deletePassword}
                  >
                    {isDeleting ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                  </button>
                </div>
              </form>
            </section>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
