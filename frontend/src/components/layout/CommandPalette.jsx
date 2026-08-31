import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Layout, X } from 'lucide-react';
import useUIStore from '../../stores/uiStore';
import { apiSearch } from '../../services/api';

export default function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        closeCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, toggleCommandPalette, closeCommandPalette]);

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [commandPaletteOpen]);

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

  const handleSelect = (result) => {
    closeCommandPalette();
    if (result.type === 'board') {
      navigate(`/board/${result.id}`);
    } else {
      navigate(`/board/${result.board_id}`, { state: { highlightNode: result.id, position: { x: result.position_x, y: result.position_y } } });
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <div className="command-palette-overlay" onClick={closeCommandPalette}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
          className="command-palette-modal"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Header */}
          <div className="command-palette-header">
            <Search />
            <input
              ref={inputRef}
              type="text"
              className="command-palette-input"
              placeholder="Görev veya pano ara... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="command-palette-clear">
                <X />
              </button>
            )}
            <button 
              onClick={closeCommandPalette}
              className="command-palette-shortcut"
              style={{ cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-strong)', padding: '2px 8px' }}
              title="Aramayı Kapat (ESC)"
            >
              ESC Kapat
            </button>
          </div>

          {/* Results Area */}
          <div className="command-palette-content">
            {!query ? (
              <div className="command-palette-empty">
                <Search />
                <p>Aramaya başlamak için yazın</p>
              </div>
            ) : loading ? (
              <div className="command-palette-empty">
                <p>Aranıyor...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="command-palette-empty">
                "{query}" için sonuç bulunamadı.
              </div>
            ) : (
              <ul className="command-palette-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {results.map((result) => (
                  <li key={result.id} style={{ margin: 0, padding: 0 }}>
                    <button
                      onClick={() => handleSelect(result)}
                      className="command-palette-item"
                    >
                      <div className={`command-palette-icon ${result.node_type || result.type}`}>
                        {result.node_type === 'wikiNode' ? <FileText /> : <Layout />}
                      </div>
                      <div className="command-palette-details">
                        <h4 className="command-palette-title">{result.label}</h4>
                        <div className="command-palette-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{result.board_name}</span>
                          {result.status && (
                            <>
                              <span>•</span>
                              <span style={{ textTransform: 'capitalize' }}>{result.status}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
