import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { StopCircle } from 'lucide-react';

function EndNode({ data, selected }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 20px',
        borderRadius: '50px',
        fontWeight: 'bold',
        transition: 'all 0.3s ease',
        boxShadow: selected ? '0 0 15px rgba(244, 63, 94, 0.4)' : '0 4px 15px rgba(0, 0, 0, 0.2)',
        transform: selected ? 'scale(1.05)' : 'none',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--accent-rose)',
        color: 'var(--text-primary)',
        minWidth: '130px',
        justifyContent: 'center'
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: 'var(--bg-primary)', 
          width: 12, 
          height: 12, 
          border: '2px solid var(--accent-rose)',
          opacity: isHovered ? 1 : 0, 
          transition: 'opacity 0.2s ease',
          pointerEvents: isHovered ? 'auto' : 'none'
        }} 
      />
      <StopCircle size={20} color="var(--accent-rose)" />
      <span style={{ letterSpacing: '0.5px', fontSize: '14px' }}>{data.label || 'Bitiş'}</span>
    </div>
  );
}

export default memo(EndNode);
