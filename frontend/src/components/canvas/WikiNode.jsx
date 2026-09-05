import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useWorkspaceStore from '../../stores/workspaceStore';

function WikiNode({ data, selected }) {
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const users = activeWorkspace?.members?.map(m => m.user) || [];
  const assignee = data.assignedTo ? users.find(u => u.id === data.assignedTo) : null;
  
  // Wiki nodes are styled in green tones
  const themeColor = '#10b981'; // Tailwind emerald-500

  return (
    <motion.div
      className={`task-node wiki-node ${selected ? 'selected' : ''}`}
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
        borderColor: selected ? themeColor : 'rgba(16, 185, 129, 0.2)',
        background: 'rgba(16, 185, 129, 0.08)',
        minWidth: '240px',
        wordBreak: 'break-word',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        className="task-node-status-bar"
        style={{ background: themeColor, opacity: 0.8 }}
      />

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-medium w-full">
          <FileText className="shrink-0" />
          <span className="task-node-label" style={{ wordBreak: 'break-all', overflowWrap: 'anywhere', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{data.label}</span>
        </div>
      </div>

      {/* Description / Content Preview */}
      {data.description && (
        <div className="text-gray-300 text-xs mt-2 flex-1 min-h-0" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
          {data.description}
        </div>
      )}

      {/* Footer */}
      <div className="task-node-footer mt-auto pt-3">
        {/* Tags */}
        <div className="task-node-tags">
          {(data.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="task-node-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{tag}</span>
          ))}
        </div>

        {/* Assignee */}
        {assignee && (
          <div
            className="task-node-assignee"
            style={{ background: assignee.avatar_color || 'var(--accent-emerald)' }}
            title={assignee.display_name}
          >
            {assignee.display_name?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(WikiNode);
