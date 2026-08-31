import { useState, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, PanelLeftClose, PanelLeft, ArrowLeft, X, FileText, Layout, HelpCircle } from 'lucide-react';
import useUIStore from '../../stores/uiStore';
import useWorkspaceStore from '../../stores/workspaceStore';
import useAuthStore from '../../stores/authStore';
import { apiSearch } from '../../services/api';

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { boardId, projectId } = useParams();
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const toggleSidebar = useUIStore(s => s.toggleSidebar);
  const toggleCommandPalette = useUIStore(s => s.toggleCommandPalette);
  const boards = useWorkspaceStore(s => s.boards);
  const projects = useWorkspaceStore(s => s.projects);

  const activeBoard = boardId && boards ? boards.find(b => b.id === boardId) : null;
  const activeProject = projectId && projects ? projects.find(p => p.id === projectId) : null;

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  // Handle Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiSearch(query);
        setResults(data || []);
      } catch (error) {
        console.error("Arama hatası:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (result) => {
    setIsDropdownOpen(false);
    setQuery('');
    if (result.type === 'board') {
      navigate(`/board/${result.id}`);
    } else {
      navigate(`/board/${result.board_id}`, { state: { highlightNode: result.id, position: { x: result.position_x, y: result.position_y } } });
    }
  };

  // We no longer have board members directly on the board, but we could show workspace members instead,
  // or simply leave it blank for now. Let's just leave it empty.
  const boardMembers = [];

  const getPageTitle = () => {
    if (location.pathname === '/dashboard') return 'Ana Sayfa';
    if (activeBoard) return activeBoard.name;
    if (activeProject) return activeProject.name;
    return 'TaskPath';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon btn-sm" onClick={toggleSidebar} title="Sidebar">
          {sidebarOpen ? <PanelLeftClose /> : <PanelLeft />}
        </button>

        {(activeBoard || activeProject) && (
          <button 
            className="btn btn-ghost btn-icon btn-sm" 
            onClick={() => {
              if (activeBoard) {
                navigate(activeBoard.project_id ? `/project/${activeBoard.project_id}` : '/dashboard');
              } else {
                navigate('/dashboard');
              }
            }} 
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="topbar-breadcrumb">
          <span>TaskPath</span>
          <span>/</span>
          <strong>{getPageTitle()}</strong>
        </div>
      </div>

      <div className="topbar-center" ref={searchRef}>
        <div style={{ position: 'relative', width: '100%' }}>
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', 
              background: 'var(--bg-tertiary)', padding: 'var(--space-sm) var(--space-md)', 
              borderRadius: 'var(--radius-full)', width: '100%',
              color: 'var(--text-muted)', border: '1px solid var(--border-default)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: isDropdownOpen ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
              borderColor: isDropdownOpen ? 'var(--accent)' : 'var(--border-default)'
            }}
          >
            <Search size={16} />
            <input 
              ref={inputRef}
              type="text" 
              placeholder="Ara... (Ctrl+K)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isDropdownOpen) setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none', 
                color: 'var(--text-primary)', fontSize: 'var(--font-sm)'
              }}
            />
            {query && (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && query && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-xs)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.3)', maxHeight: '400px', overflowY: 'auto'
                }}
              >
                {loading ? (
                  <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                    Aranıyor...
                  </div>
                ) : results.length === 0 ? (
                  <div style={{ padding: 'var(--space-md)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>
                    "{query}" için sonuç bulunamadı.
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {results.map((result) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelectResult(result)}
                          className="sidebar-nav-item"
                          style={{ 
                            width: '100%', textAlign: 'left', border: 'none', background: 'none', 
                            padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                            fontFamily: 'inherit', cursor: 'pointer'
                          }}
                        >
                          <div style={{ color: 'var(--accent)', background: 'rgba(139, 92, 246, 0.1)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {result.type === 'node' ? <FileText size={16} /> : <Layout size={16} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--font-sm)', fontWeight: 'var(--fw-medium)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {result.label}
                            </div>
                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                              {result.board_name} {result.status ? `• ${result.status}` : ''}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="topbar-right">
        <button 
          className="btn btn-ghost btn-icon" 
          onClick={() => useUIStore.getState().openOnboardingModal()} 
          title="Kullanım Rehberi & Yardım"
          style={{ marginRight: 'var(--space-sm)' }}
        >
          <HelpCircle size={20} className="text-violet-400" />
        </button>

        {boardMembers.length > 0 && (
          <div className="topbar-members">
            {boardMembers.slice(0, 4).map(member => (
              <div
                key={member.id}
                className="topbar-member-avatar"
                style={{ background: member.avatarColor }}
                title={member.displayName}
              >
                {member.displayName.charAt(0).toUpperCase()}
              </div>
            ))}
            {boardMembers.length > 4 && (
              <div className="topbar-member-avatar" style={{ background: 'var(--bg-elevated)' }}>
                +{boardMembers.length - 4}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
