import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Target } from 'lucide-react';
import useBoardStore from '../../stores/boardStore';
import { useParams } from 'react-router-dom';

function MilestoneNode({ id, data, selected }) {
  const [isHovered, setIsHovered] = useState(false);
  const { boardId } = useParams();
  const edges = useBoardStore(s => s.edges[boardId]) || [];
  const nodes = useBoardStore(s => s.nodes[boardId]) || [];
  
  const incomingEdgeSources = edges.filter(e => e.target === id).map(e => e.source);
  const dependentNodes = nodes.filter(n => incomingEdgeSources.includes(n.id) && n.type === 'taskNode');
  
  const total = dependentNodes.length;
  const completed = dependentNodes.filter(n => n.data.status === 'done').length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: '16px',
        padding: '20px',
        transition: 'all 0.3s ease',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        minWidth: '300px',
        border: '1px solid var(--accent-violet)',
        boxShadow: selected ? '0 0 20px rgba(139, 92, 246, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.3)',
        transform: selected ? 'scale(1.05)' : 'none'
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: 'var(--bg-primary)', 
          width: 12, 
          height: 12, 
          border: '2px solid var(--accent-violet)',
          opacity: isHovered ? 1 : 0, 
          transition: 'opacity 0.2s ease',
          pointerEvents: isHovered ? 'auto' : 'none'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ 
          background: 'var(--bg-primary)', 
          width: 12, 
          height: 12, 
          border: '2px solid var(--accent-violet)',
          opacity: isHovered ? 1 : 0, 
          transition: 'opacity 0.2s ease',
          pointerEvents: isHovered ? 'auto' : 'none'
        }} 
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(139, 92, 246, 0.3)', paddingBottom: '12px', marginBottom: '12px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)' }}>
          <Target color="var(--accent-violet)" size={26} />
        </div>
        <div>
          <h3 style={{ fontWeight: 'bold', fontSize: '18px', lineHeight: '1.2', color: 'var(--text-primary)', margin: 0, wordBreak: 'break-all', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{data.label}</h3>
          <p style={{ fontSize: '12px', color: 'var(--accent-violet)', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase', margin: '4px 0 0 0' }}>Milestone</p>
        </div>
      </div>

      {data.description && (
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', maxHeight: '40px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-all', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {data.description}
        </div>
      )}

      {/* Progress Bar */}
      <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-primary)' }}>
          <span>İlerleme</span>
          <span style={{ color: 'var(--accent-violet)' }}>{progress}%</span>
        </div>
        <div style={{ width: '100%', background: 'var(--bg-primary)', borderRadius: '999px', height: '10px', overflow: 'hidden', border: '1px solid var(--border-default)' }}>
          <div 
            style={{ 
              height: '100%', 
              borderRadius: '999px', 
              transition: 'all 1s ease-out', 
              width: `${progress}%`, 
              background: 'linear-gradient(90deg, var(--accent-violet) 0%, #d8b4fe 100%)' 
            }} 
          />
        </div>
        <div style={{ fontSize: '12px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>
          {completed} / {total} Görev Tamamlandı
        </div>
      </div>
    </div>
  );
}

export default memo(MilestoneNode);
