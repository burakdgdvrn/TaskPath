import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          padding: '24px',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          borderRadius: '12px'
        }}>
          <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
            <AlertTriangle size={48} style={{ color: 'var(--accent-rose)' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            {this.props.fallbackTitle || "Bir Şeyler Ters Gitti"}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
            Bu bileşen yüklenirken beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi deneyin.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'var(--accent-violet)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'
            }}
          >
            <RefreshCcw size={16} /> Sayfayı Yenile
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{ marginTop: '32px', textAlign: 'left', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '8px', width: '100%', maxWidth: '800px', overflowX: 'auto', border: '1px solid var(--border-default)' }}>
              <p style={{ color: 'var(--accent-rose)', fontWeight: 'bold', marginBottom: '8px' }}>
                {this.state.error.toString()}
              </p>
              <pre style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
