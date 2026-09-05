import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Tag, CheckCircle2, Circle, ChevronsUp, Equal, ChevronDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import useBoardStore from '../../stores/boardStore';
import useWorkspaceStore from '../../stores/workspaceStore';

const STATUS_COLORS = {
  todo: '#64748b',
  in_progress: '#3b82f6',
  testing: '#f59e0b',
  done: '#10b981',
  archived: '#3f3f46',
};

const STATUS_LABELS = {
  todo: 'Yapılacak',
  in_progress: 'Devam Ediyor',
  testing: 'Test Ediliyor',
  done: 'Tamamlandı',
  archived: 'Arşiv',
};

const PRIORITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#f43f5e',
};

const PriorityIcon = ({ priority, color }) => {
  if (priority === 'high') return <ChevronsUp size={14} color={color} />;
  if (priority === 'low') return <ChevronDown size={14} color={color} />;
  return <Equal size={14} color={color} />;
};

function CustomNode({ id, data, selected }) {
  const { boardId } = useParams();
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const users = activeWorkspace?.members?.map(m => m.user) || [];
  const updateNode = useBoardStore(s => s.updateNode);
  
  const assignee = data.assignedTo ? users.find(u => u.id === data.assignedTo) : null;
  const statusColor = STATUS_COLORS[data.status] || STATUS_COLORS.todo;
  const priorityColor = PRIORITY_COLORS[data.priority] || PRIORITY_COLORS.medium;

  const handleToggleDone = (e) => {
    e.stopPropagation(); // prevent selecting the node
    const newStatus = data.status === 'done' ? 'todo' : 'done';
    if (boardId) {
      updateNode(boardId, id, { data: { status: newStatus } });
    }
  };

  return (
    <motion.div
      className={`task-node ${selected ? 'selected' : ''}`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        mass: 0.8,
      }}
      whileHover={{ scale: 1.02 }}
      style={{
        borderLeft: `4px solid ${statusColor}`,
        boxShadow: selected ? '0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--accent-violet)' : '0 2px 8px rgba(0,0,0,0.05)',
        zIndex: selected ? 100 : 1, // ensure selected nodes are above others
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ width: '12px', height: '12px', border: '2px solid var(--bg-primary)', background: 'var(--accent-teal)', zIndex: 10 }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ width: '12px', height: '12px', border: '2px solid var(--bg-primary)', background: 'var(--accent-teal)', zIndex: 10 }}
      />

      {/* Header */}
      <div className="task-node-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1 }}>
          <button 
            onClick={handleToggleDone}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="nodrag nopan task-node-complete-btn"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              marginTop: '2px',
              color: data.status === 'done' ? '#10b981' : 'var(--text-muted)',
              display: 'flex'
            }}
          >
            {data.status === 'done' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <span className="task-node-label" style={{ 
                textDecoration: data.status === 'done' ? 'line-through' : 'none',
                color: data.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)'
              }}>
                {data.label}
              </span>
              <span className="task-node-priority" style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'center',
                color: priorityColor,
                flexShrink: 0
              }} title={`Öncelik: ${data.priority === 'high' ? 'Yüksek' : data.priority === 'low' ? 'Düşük' : 'Orta'}`}>
                <PriorityIcon priority={data.priority} color={priorityColor} size={16} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div className="task-node-desc">{data.description}</div>
      )}

      {/* Footer */}
      <div className="task-node-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Status Badge - Hidden if 'todo' */}
          {data.status !== 'todo' && (
            <span
              className={`badge badge-${data.status}`}
              style={{ fontSize: '10px', padding: '2px 8px' }}
            >
              {STATUS_LABELS[data.status] || data.status}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Tags */}
          <div className="task-node-tags" style={{ marginRight: assignee ? '4px' : '0' }}>
            {(data.tags || []).slice(0, 1).map(tag => (
              <span key={tag} className="task-node-tag" style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag}</span>
            ))}
            {(data.tags || []).length > 1 && (
              <span className="task-node-tag">+{data.tags.length - 1}</span>
            )}
          </div>

        {/* Assignee */}
        {assignee && (
          <div
            className="task-node-assignee"
            style={{ 
              background: assignee.avatar_base64 ? `url(${assignee.avatar_base64}) center/cover no-repeat` : (assignee.avatar_color || 'var(--accent-blue)'),
              border: assignee.avatar_base64 ? '1px solid var(--border-subtle)' : 'none'
            }}
            title={assignee.display_name}
          >
            {!assignee.avatar_base64 && assignee.display_name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      </div>
    </motion.div>
  );
}

export default memo(CustomNode);
