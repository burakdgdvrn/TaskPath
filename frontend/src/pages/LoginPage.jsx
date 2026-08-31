import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GitBranch, AlertCircle, ArrowRight } from 'lucide-react';
import useAuthStore from '../stores/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, loading, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const success = await login(email, password);
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
          <h1>Geleceğin Görev Haritası</h1>
          <p>
            TaskPath ile projelerinizi görselleştirin, ekiplerinizi senkronize edin ve hedeflerinize daha hızlı ulaşın.
            Fikirlerinizi gerçeğe dönüştürmeye bugün başlayın.
          </p>
        </div>
      </div>

      {/* Sağ Sütun - Giriş Formu */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Hoş Geldiniz</h2>
            <p>Hesabınıza giriş yaparak kaldığınız yerden devam edin.</p>
          </div>

          {error && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="email">E-posta Adresi</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                placeholder="ornek@sirket.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label" htmlFor="password">Şifre</label>
              <input
                id="password"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer-link">
            Henüz bir hesabınız yok mu? <Link to="/register">Hemen oluşturun</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
