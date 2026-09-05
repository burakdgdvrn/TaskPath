import { create } from 'zustand';
import {
  apiListNodes, apiCreateNode, apiUpdateNode, apiDeleteNode,
  apiListEdges, apiCreateEdge, apiDeleteEdge,
  apiBulkUpdateNodes, apiBulkDeleteNodes
} from '../services/api';

/**
 * Convert backend node (flat) → React Flow node shape
 */
function backendToFlowNode(n) {
  return {
    id: n.id,
    boardId: n.board_id,
    type: (n.node_type === 'task' || !n.node_type) ? 'taskNode' : n.node_type,
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.label,
      description: n.description || '',
      nodeType: n.node_type,
      status: n.status,
      priority: n.priority,
      tags: n.tags ? n.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      assignedTo: n.assigned_to || null,
      dueDate: n.due_date || null,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    },
  };
}

/**
 * Convert backend edge → React Flow edge shape
 */
function backendToFlowEdge(e) {
  return {
    id: e.id,
    source: e.source_id,
    target: e.target_id,
    type: 'smoothstep',
    data: { edgeType: e.edge_type },
  };
}

const useBoardStore = create((set, get) => ({
  nodes: {},  // boardId -> FlowNode[]
  edges: {},  // boardId -> FlowEdge[]
  activeBoard: null,
  selectedNode: null,
  loading: false,

  // ──── BOARD ACTIONS ────

  setActiveBoard: (board) => {
    set({ activeBoard: board, selectedNode: null });
  },

  // ──── LOAD BOARD DATA ────

  loadBoardData: async (boardId) => {
    try {
      const isInitialLoad = !get().nodes[boardId];
      if (isInitialLoad) {
        set({ loading: true });
      }
      const [nodes, edges] = await Promise.all([
        apiListNodes(boardId),
        apiListEdges(boardId),
      ]);
      set(state => ({
        nodes: { ...state.nodes, [boardId]: nodes.map(backendToFlowNode) },
        edges: { ...state.edges, [boardId]: edges.map(backendToFlowEdge) },
      }));
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      set({ loading: false });
    }
  },

  // ──── NODE ACTIONS ────

  addNode: async (boardId, nodeData) => {
    try {
      const apiData = {
        label: nodeData.label || 'Yeni Görev',
        description: nodeData.description || '',
        node_type: nodeData.nodeType || 'task',
        priority: nodeData.priority || 'medium',
        position_x: nodeData.position?.x || 300,
        position_y: nodeData.position?.y || 300,
        tags: Array.isArray(nodeData.tags) ? nodeData.tags.join(', ') : (nodeData.tags || ''),
        assigned_to: nodeData.assignedTo || null,
      };
      const created = await apiCreateNode(boardId, apiData);
      const flowNode = backendToFlowNode(created);

      set(state => ({
        nodes: {
          ...state.nodes,
          [boardId]: [...(state.nodes[boardId] || []), flowNode],
        },
      }));
      return flowNode;
    } catch (err) {
      console.error('Failed to create node:', err);
      throw err;
    }
  },

  updateNode: async (boardId, nodeId, updates) => {
    // Optimistic update in UI
    set(state => ({
      nodes: {
        ...state.nodes,
        [boardId]: (state.nodes[boardId] || []).map(n =>
          n.id === nodeId
            ? {
                ...n,
                ...(updates.position ? { position: updates.position } : {}),
                data: { ...n.data, ...updates.data, updatedAt: new Date().toISOString() },
              }
            : n
        ),
      },
    }));

    // Sync to backend
    try {
      const apiData = {};
      if (updates.data) {
        if (updates.data.label !== undefined) apiData.label = updates.data.label;
        if (updates.data.description !== undefined) apiData.description = updates.data.description;
        if (updates.data.status !== undefined) apiData.status = updates.data.status;
        if (updates.data.priority !== undefined) apiData.priority = updates.data.priority;
        if (updates.data.nodeType !== undefined) apiData.node_type = updates.data.nodeType;
        if (updates.data.assignedTo !== undefined) apiData.assigned_to = updates.data.assignedTo;
        if (updates.data.tags !== undefined) apiData.tags = updates.data.tags.join(', ');
      }
      if (updates.position) {
        apiData.position_x = updates.position.x;
        apiData.position_y = updates.position.y;
      }
      if (Object.keys(apiData).length > 0) {
        await apiUpdateNode(nodeId, apiData);
      }
    } catch (err) {
      console.error('Failed to update node:', err);
    }
  },

  deleteNode: async (boardId, nodeId) => {
    // Optimistic
    set(state => ({
      nodes: {
        ...state.nodes,
        [boardId]: (state.nodes[boardId] || []).filter(n => n.id !== nodeId),
      },
      edges: {
        ...state.edges,
        [boardId]: (state.edges[boardId] || []).filter(e => e.source !== nodeId && e.target !== nodeId),
      },
      selectedNode: state.selectedNode?.id === nodeId ? null : state.selectedNode,
    }));

    try {
      await apiDeleteNode(nodeId);
    } catch (err) {
      console.error('Failed to delete node:', err);
    }
  },

  bulkUpdateNodes: async (boardId, data) => {
    try {
      const updatedNodes = await apiBulkUpdateNodes(boardId, data);
      
      // Update local state
      set(state => {
        const current = state.nodes[boardId] || [];
        const newNodes = current.map(n => {
          const updated = updatedNodes.find(u => u.id === n.id);
          return updated ? backendToFlowNode(updated) : n;
        });
        return { nodes: { ...state.nodes, [boardId]: newNodes } };
      });
      
    } catch (err) {
      console.error('Failed to bulk update nodes:', err);
      throw err;
    }
  },

  bulkDeleteNodes: async (boardId, nodeIds) => {
    try {
      await apiBulkDeleteNodes(boardId, { node_ids: nodeIds });
      
      // Update local state
      set(state => {
        const currentNodes = state.nodes[boardId] || [];
        const currentEdges = state.edges[boardId] || [];
        
        return {
          nodes: { ...state.nodes, [boardId]: currentNodes.filter(n => !nodeIds.includes(n.id)) },
          edges: { ...state.edges, [boardId]: currentEdges.filter(e => !nodeIds.includes(e.source) && !nodeIds.includes(e.target)) }
        };
      });
    } catch (err) {
      console.error('Failed to bulk delete nodes:', err);
      throw err;
    }
  },

  setSelectedNode: (node) => set({ selectedNode: node }),

  // Handle React Flow node changes (drag, select, etc.)
  onNodesChange: (boardId, changes) => {
    const positionUpdates = [];

    set(state => {
      const currentNodes = state.nodes[boardId] || [];
      let updatedNodes = [...currentNodes];

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          updatedNodes = updatedNodes.map(n =>
            n.id === change.id ? { ...n, position: change.position } : n
          );
          if (change.dragging === false) {
            // Drag ended — save to backend
            positionUpdates.push({ id: change.id, position: change.position });
          }
        } else if (change.type === 'select') {
          updatedNodes = updatedNodes.map(n =>
            n.id === change.id ? { ...n, selected: change.selected } : n
          );
        } else if (change.type === 'remove') {
          updatedNodes = updatedNodes.filter(n => n.id !== change.id);
        }
      }

      return { nodes: { ...state.nodes, [boardId]: updatedNodes } };
    });

    // Save position changes to backend
    for (const update of positionUpdates) {
      apiUpdateNode(update.id, {
        position_x: update.position.x,
        position_y: update.position.y,
      }).catch(err => console.error('Failed to save position:', err));
    }
  },

  // ──── EDGE ACTIONS ────

  addEdge: async (boardId, edgeData) => {
    try {
      const created = await apiCreateEdge(boardId, {
        source_id: edgeData.source,
        target_id: edgeData.target,
        edge_type: edgeData.edgeType || 'depends_on',
      });
      const flowEdge = backendToFlowEdge(created);

      set(state => ({
        edges: {
          ...state.edges,
          [boardId]: [...(state.edges[boardId] || []), flowEdge],
        },
      }));
      return flowEdge;
    } catch (err) {
      console.error('Failed to create edge:', err);
      throw err;
    }
  },

  deleteEdge: async (boardId, edgeId) => {
    set(state => ({
      edges: {
        ...state.edges,
        [boardId]: (state.edges[boardId] || []).filter(e => e.id !== edgeId),
      },
    }));
    try {
      await apiDeleteEdge(edgeId);
    } catch (err) {
      console.error('Failed to delete edge:', err);
    }
  },

  onEdgesChange: (boardId, changes) => {
    set(state => {
      let currentEdges = state.edges[boardId] || [];
      for (const change of changes) {
        if (change.type === 'remove') {
          const edgeId = change.id;
          currentEdges = currentEdges.filter(e => e.id !== edgeId);
          apiDeleteEdge(edgeId).catch(err => console.error('Failed to delete edge:', err));
        }
      }
      return { edges: { ...state.edges, [boardId]: currentEdges } };
    });
  },

  // No longer needed — backend handles persistence
  persistNow: () => {},
}));

export default useBoardStore;
