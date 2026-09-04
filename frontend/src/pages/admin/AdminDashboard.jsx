import { useState, useEffect } from 'react';
import { apiAdminGetStats } from '../../services/api';
import { Users, Briefcase, Folder, FileType } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await apiAdminGetStats();
        setStats(data);
      } catch (err) {
        toast.error('İstatistikler yüklenemedi: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return <div style={{ color: 'var(--text-muted)' }}>Yükleniyor...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: 'var(--font-2xl)', fontWeight: 'var(--fw-bold)', marginBottom: 'var(--space-xl)', color: 'var(--text-primary)' }}>
        Sistem Özeti
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--space-lg)'
      }}>
        <StatCard title="Toplam Kullanıcı" value={stats?.total_users || 0} icon={<Users size={24} />} color="var(--accent)" />
        <StatCard title="Çalışma Alanları" value={stats?.total_workspaces || 0} icon={<Briefcase size={24} />} color="var(--accent-teal)" />
        <StatCard title="Projeler" value={stats?.total_projects || 0} icon={<Folder size={24} />} color="var(--accent-rose)" />
        <StatCard title="Görev Düğümleri" value={stats?.total_nodes || 0} icon={<FileType size={24} />} color="var(--accent-amber)" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: `color-mix(in srgb, ${color} 15%, transparent)`,
          color: color,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', fontWeight: 'var(--fw-medium)' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 'var(--font-3xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
