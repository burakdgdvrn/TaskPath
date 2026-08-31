import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, AlertCircle, ArrowRight } from 'lucide-react';
import useAuthStore from '../stores/authStore';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const { register, error, loading, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    setLocalError('');
    
    if (password !== confirmPassword) {
      setLocalError('Şifreler eşleşmiyor. Lütfen kontrol edin.');
      return;
    }

    const success = await register(email, displayName, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-split-layout">
      {/* Sol Sütun - Görsel Şölen */}
      <div className="auth-left">
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <GitBranch size={28} />
          </div>
          <h1>Yolculuğa Başlayın</h1>
          <p>
            Yeni nesil proje yönetim platformuna katılın.
            Fikirlerinizi görselleştirin, ekiplerinizle uyum içinde çalışın.
          </p>
        </div>
      </div>

      {/* Sağ Sütun - Kayıt Formu */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Kayıt Ol</h2>
            <p>TaskPath dünyasına adım atmak için hesabınızı oluşturun.</p>
          </div>

          {(error || localError) && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{localError || error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="displayName">Adınız Soyadınız</label>
              <input
                id="displayName"
                className="auth-input"
                type="text"
                placeholder="Örn: John Doe"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="email">E-posta Adresi</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="password">Şifre</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="confirmPassword">Şifreyi Doğrula</label>
              <input
                id="confirmPassword"
                className="auth-input"
                type="password"
                placeholder="Şifrenizi tekrar girin"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer-link">
            Zaten bir hesabınız var mı? <Link to="/login">Giriş yapın</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
