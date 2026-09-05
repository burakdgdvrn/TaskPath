import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  useReactFlow,
  ReactFlowProvider,
  addEdge as rfAddEdge,
  useViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNode from '../components/canvas/CustomNode';
import WikiNode from '../components/canvas/WikiNode';
import StartNode from '../components/canvas/StartNode';
import EndNode from '../components/canvas/EndNode';
import MilestoneNode from '../components/canvas/MilestoneNode';
import CustomEdge from '../components/canvas/CustomEdge';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import NodeDetailPanel from '../components/canvas/NodeDetailPanel';
import MultiNodeDetailPanel from '../components/canvas/MultiNodeDetailPanel';
import CreateNodeModal from '../components/canvas/CreateNodeModal';
import RoadmapImportModal from '../components/canvas/RoadmapImportModal';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { computeAllEdgeRoutes } from '../components/canvas/smartEdgeUtil';
import useBoardStore from '../stores/boardStore';
import useWorkspaceStore from '../stores/workspaceStore';
import useUIStore from '../stores/uiStore';
import useAuthStore from '../stores/authStore';
import useWebSocket from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import { X, Trash2, Edit2, Copy, Trash, CheckCircle2, Plus, FileText, Target, ClipboardPaste, PlayCircle, StopCircle, Info } from 'lucide-react';

const nodeTypes = { taskNode: CustomNode, wikiNode: WikiNode, startNode: StartNode, endNode: EndNode, milestoneNode: MilestoneNode };
const edgeTypes = { custom: CustomEdge };

function StarBackground({ gap = 24, size = 4, color = "rgba(43, 38, 35, 0.15)" }) {
  const { x, y, zoom } = useViewport();
  
  const scaledGap = gap * zoom;
  const scaledSize = size * zoom;
  const offsetX = x % scaledGap;
  const offsetY = y % scaledGap;
  
  // 4-pointed star
  const pathData = `
    M ${scaledSize/2} 0 
    L ${scaledSize*0.62} ${scaledSize*0.38} 
    L ${scaledSize} ${scaledSize/2} 
    L ${scaledSize*0.62} ${scaledSize*0.62} 
    L ${scaledSize/2} ${scaledSize} 
    L ${scaledSize*0.38} ${scaledSize*0.62} 
    L 0 ${scaledSize/2} 
    L ${scaledSize*0.38} ${scaledSize*0.38} 
    Z
  `;

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        top: 0, 
        left: 0, 
        zIndex: -1, 
        pointerEvents: 'none' 
      }}
    >
      <defs>
        <pattern
          id="star-pattern"
          x={offsetX}
          y={offsetY}
          width={scaledGap}
          height={scaledGap}
          patternUnits="userSpaceOnUse"
        >
          <path d={pathData} fill={color} />
        </pattern>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="url(#star-pattern)" />
    </svg>
  );
}

function BoardCanvas() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  // Store
  const boards = useWorkspaceStore(s => s.boards);
  const board = boards.find(b => b.id === boardId);
  const activeWorkspaceId = useWorkspaceStore(s => s.activeWorkspaceId);
  const loadBoardData = useBoardStore(s => s.loadBoardData);
  const nodes = useBoardStore(s => s.nodes)[boardId] || [];
  const edges = useBoardStore(s => s.edges)[boardId] || [];
  const addNode = useBoardStore(s => s.addNode);
  const addEdge = useBoardStore(s => s.addEdge);
  const onNodesChange = useBoardStore(s => s.onNodesChange);
  const onEdgesChange = useBoardStore(s => s.onEdgesChange);
  const selectedNode = useBoardStore(s => s.selectedNode);
  const setSelectedNode = useBoardStore(s => s.setSelectedNode);

  // Compute central edge paths to allow segment overlap detection
  const edgePaths = useMemo(() => computeAllEdgeRoutes(nodes, edges), [nodes, edges]);

  const users = useAuthStore(s => s.users);

  // Inject paths into edges
  const edgesWithPaths = useMemo(() => {
    return edges.map(edge => {
      // Find source node
      const sourceNode = nodes.find(n => n.id === edge.source);
      let assigneeColor = 'rgba(139, 92, 246, 0.9)'; // Default accent color (more solid)
      
      if (sourceNode?.data?.assignedTo) {
        const assignee = users.find(u => u.id === sourceNode.data.assignedTo);
        if (assignee && assignee.avatarColor) {
          assigneeColor = assignee.avatarColor;
        }
      }

      return {
        ...edge,
        style: { ...edge.style, stroke: assigneeColor },
        data: {
          ...edge.data,
          smartPathPoints: edgePaths[edge.id] || [],
          assigneeColor, // pass it to custom edge just in case
        }
      };
    });
  }, [edges, edgePaths, nodes, users]);

  // UI
  const createNodeModalOpen = useUIStore(s => s.createNodeModalOpen);
  const openCreateNodeModal = useUIStore(s => s.openCreateNodeModal);
  const closeCreateNodeModal = useUIStore(s => s.closeCreateNodeModal);
  const theme = useUIStore(s => s.theme);

  // WebSocket
  const { onlineUsers, cursors, sendCursor, broadcast } = useWebSocket(boardId);

  // Multi-selection
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLassoActive, setIsLassoActive] = useState(false);
  const selectedNodesList = nodes.filter(n => n.selected);

  // Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Zoom level
  const [zoom, setZoom] = useState(1);

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

  // Edge Context Menu
  const [edgeMenu, setEdgeMenu] = useState(null);
  const [nodeMenu, setNodeMenu] = useState(null);
  const [paneMenu, setPaneMenu] = useState(null);
  const lastMousePos = useRef({ x: 300, y: 300 });

  useEffect(() => {
    if (boardId) {
      loadBoardData(boardId);
    }
  }, [boardId, loadBoardData]);

  const pushToHistory = useCallback(() => {
    const currentNodes = useBoardStore.getState().nodes[boardId] || [];
    const currentEdges = useBoardStore.getState().edges[boardId] || [];
    const snapshot = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      if (newHistory.length > 0 && newHistory[newHistory.length - 1] === snapshot) {
        return newHistory;
      }
      newHistory.push(snapshot);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [boardId, historyIndex]);

  // Initial snapshot on load
  useEffect(() => {
    if (nodes.length > 0 && history.length === 0) {
      pushToHistory();
    }
  }, [nodes.length, history.length, pushToHistory]);

  // Handle node changes (position, selection)
  const handleNodesChange = useCallback((changes) => {
    onNodesChange(boardId, changes);
    
    let isSignificant = false;
    // Broadcast position changes for live sync
    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        broadcast('node:move', { node_id: change.id, position: change.position });
        if (change.dragging === false) isSignificant = true;
      }
      if (change.type === 'remove' || change.type === 'add') {
        isSignificant = true;
      }
    });

    if (isSignificant) {
      setTimeout(pushToHistory, 0);
    }
  }, [boardId, onNodesChange, broadcast, pushToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    isUndoing.current = true;
    const prevIndex = historyIndex - 1;
    const snapshot = JSON.parse(history[prevIndex]);
    
    const currentNodes = useBoardStore.getState().nodes[boardId] || [];
    const positionChanges = [];
    const restoredNodeIds = [];
    const softDeletedNodeIds = [];
    
    snapshot.nodes.forEach(snapNode => {
      const current = currentNodes.find(n => n.id === snapNode.id);
      if (current) {
        if (current.position.x !== snapNode.position.x || current.position.y !== snapNode.position.y) {
          positionChanges.push({ id: snapNode.id, type: 'position', position: snapNode.position, dragging: false });
        }
      } else {
        restoredNodeIds.push(snapNode.id);
      }
    });

    currentNodes.forEach(currentNode => {
      if (!snapshot.nodes.find(n => n.id === currentNode.id)) {
        softDeletedNodeIds.push(currentNode.id);
      }
    });

    if (positionChanges.length > 0) {
      // This will automatically sync to backend and broadcast via WebSocket
      handleNodesChange(positionChanges);
    }
    
    if (restoredNodeIds.length > 0) {
      useBoardStore.getState().bulkUpdateNodes(boardId, { node_ids: restoredNodeIds, is_deleted: false })
        .then(() => restoredNodeIds.forEach(id => broadcast('node:create', { node_id: id })))
        .catch(console.error);
    }
    
    if (softDeletedNodeIds.length > 0) {
      useBoardStore.getState().bulkDeleteNodes(boardId, softDeletedNodeIds)
        .then(() => softDeletedNodeIds.forEach(id => broadcast('node:delete', { node_id: id })))
        .catch(console.error);
    }

    useBoardStore.setState(state => ({
      nodes: { ...state.nodes, [boardId]: snapshot.nodes },
      edges: { ...state.edges, [boardId]: snapshot.edges },
    }));
    setHistoryIndex(prevIndex);
  }, [historyIndex, history, boardId, handleNodesChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    isUndoing.current = true;
    const nextIndex = historyIndex + 1;
    const snapshot = JSON.parse(history[nextIndex]);
    
    const currentNodes = useBoardStore.getState().nodes[boardId] || [];
    const positionChanges = [];
    const restoredNodeIds = [];
    const softDeletedNodeIds = [];
    
    snapshot.nodes.forEach(snapNode => {
      const current = currentNodes.find(n => n.id === snapNode.id);
      if (current) {
        if (current.position.x !== snapNode.position.x || current.position.y !== snapNode.position.y) {
          positionChanges.push({ id: snapNode.id, type: 'position', position: snapNode.position, dragging: false });
        }
      } else {
        restoredNodeIds.push(snapNode.id);
      }
    });

    currentNodes.forEach(currentNode => {
      if (!snapshot.nodes.find(n => n.id === currentNode.id)) {
        softDeletedNodeIds.push(currentNode.id);
      }
    });

    if (positionChanges.length > 0) {
      // This will automatically sync to backend and broadcast via WebSocket
      handleNodesChange(positionChanges);
    }
    
    if (restoredNodeIds.length > 0) {
      useBoardStore.getState().bulkUpdateNodes(boardId, { node_ids: restoredNodeIds, is_deleted: false })
        .then(() => restoredNodeIds.forEach(id => broadcast('node:create', { node_id: id })))
        .catch(console.error);
    }
    
    if (softDeletedNodeIds.length > 0) {
      useBoardStore.getState().bulkDeleteNodes(boardId, softDeletedNodeIds)
        .then(() => softDeletedNodeIds.forEach(id => broadcast('node:delete', { node_id: id })))
        .catch(console.error);
    }

    useBoardStore.setState(state => ({
      nodes: { ...state.nodes, [boardId]: snapshot.nodes },
      edges: { ...state.edges, [boardId]: snapshot.edges },
    }));
    setHistoryIndex(nextIndex);
  }, [historyIndex, history, boardId, handleNodesChange]);


  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(boardId, changes);
    if (changes.some(c => c.type === 'remove' || c.type === 'add')) {
        setTimeout(pushToHistory, 0);
    }
  }, [boardId, onEdgesChange, pushToHistory]);

  // Handle new connections
  const handleConnect = useCallback(async (connection) => {
    try {
      await addEdge(boardId, {
        source: connection.source,
        target: connection.target,
        edgeType: 'depends_on',
      });
      // In case auto-assign triggered on backend, we reload data
      useBoardStore.getState().loadBoardData(boardId);
      
      broadcast('edge:create', { source: connection.source, target: connection.target });
      broadcast('node:update', { node_id: connection.target });
      toast.success('Bağlantı oluşturuldu');
      setTimeout(pushToHistory, 0);
    } catch {
      toast.error('Bağlantı oluşturulamadı');
    }
  }, [boardId, addEdge, broadcast, pushToHistory]);

  // Handle keyboard deletions
  const handleNodesDelete = useCallback(async (deletedNodes) => {
    try {
      const nodeIds = deletedNodes.map(n => n.id);
      await useBoardStore.getState().bulkDeleteNodes(boardId, nodeIds);
      nodeIds.forEach(id => broadcast('node:delete', { node_id: id }));
      toast.success('Görevler silindi');
      setTimeout(pushToHistory, 0);
    } catch {
      toast.error('Görevler silinirken hata oluştu');
    }
  }, [boardId, broadcast, pushToHistory]);

  const handleEdgesDelete = useCallback(async (deletedEdges) => {
    try {
      for (const edge of deletedEdges) {
        await useBoardStore.getState().deleteEdge(boardId, edge.id);
        broadcast('edge:delete', { edge_id: edge.id });
      }
      setTimeout(pushToHistory, 0);
    } catch {
      toast.error('Bağlantı silinirken hata oluştu');
    }
  }, [boardId, broadcast, pushToHistory]);

  // Right-click (or Long Press on mobile) to add node instantly
  const handlePaneContextMenu = useCallback((event) => {
    event.preventDefault(); // Prevent default browser context menu
    setPaneMenu({
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  // Close detail panel and menus
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setEdgeMenu(null);
    setNodeMenu(null);
    setPaneMenu(null);
  }, [setSelectedNode]);

  const handleNodeClick = useCallback((event, node) => {
    setEdgeMenu(null);
    setNodeMenu(null);
    setPaneMenu(null);
    const fullNode = nodes.find(n => n.id === node.id);
    setSelectedNode(fullNode || node);
  }, [nodes, setSelectedNode]);

  const handlePasteNodes = useCallback(async (nodesToPaste, edgesToPaste = []) => {
    if (!nodesToPaste || nodesToPaste.length === 0) return;
    try {
      const mousePos = lastMousePos.current;
      const firstNodePos = nodesToPaste[0].position || { x: 300, y: 300 };
      const dx = mousePos.x - firstNodePos.x;
      const dy = mousePos.y - firstNodePos.y;

      const oldToNew = {};

      const newNodes = await Promise.all(nodesToPaste.map(async (n) => {
        const pasted = await addNode(boardId, {
          label: n.data.label + ' (Kopya)',
          description: n.data.description,
          nodeType: n.type,
          status: 'todo',
          priority: n.data.priority,
          tags: n.data.tags,
          position: { x: (n.position?.x || 300) + dx, y: (n.position?.y || 300) + dy }
        });
        oldToNew[n.id] = pasted.id;
        broadcast('node:create', { node_id: pasted.id });
        return pasted;
      }));

      if (edgesToPaste.length > 0) {
        await Promise.all(edgesToPaste.map(async (e) => {
          const newSource = oldToNew[e.source];
          const newTarget = oldToNew[e.target];
          if (newSource && newTarget) {
            await addEdge(boardId, {
              source: newSource,
              target: newTarget,
              edgeType: e.data?.edgeType || 'depends_on',
            });
            broadcast('edge:create', { source: newSource, target: newTarget });
          }
        }));
      }

      toast.success(`${newNodes.length} görev yapıştırıldı`);
      setTimeout(pushToHistory, 0);
    } catch(err) {
      toast.error('Görevler yapıştırılamadı');
    }
  }, [boardId, addNode, addEdge, broadcast, pushToHistory]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && e.target.tagName === 'BODY') {
        const toCopy = selectedNodesList.length > 0 ? selectedNodesList : (selectedNode ? [selectedNode] : []);
        if (toCopy.length > 0) {
          const toCopyIds = new Set(toCopy.map(n => n.id));
          const edgesToCopy = edges.filter(edge => toCopyIds.has(edge.source) && toCopyIds.has(edge.target));
          localStorage.setItem('taskpath_clipboard', JSON.stringify({ nodes: toCopy, edges: edgesToCopy }));
          toast.success(`${toCopy.length} görev kopyalandı`);
        }
      }
      if (e.key === 'v' && (e.ctrlKey || e.metaKey) && e.target.tagName === 'BODY') {
        const clipboardData = localStorage.getItem('taskpath_clipboard');
        if (clipboardData) {
          try {
            const parsed = JSON.parse(clipboardData);
            const nodesToPaste = parsed.nodes ? parsed.nodes : parsed;
            const edgesToPaste = parsed.edges ? parsed.edges : [];
            handlePasteNodes(nodesToPaste, edgesToPaste);
          } catch(err) {}
        }
      }
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && e.target.tagName === 'BODY') {
        e.preventDefault();
        openCreateNodeModal({ x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 });
      }
      if (e.key === 'Escape') {
        handlePaneClick();
        closeCreateNodeModal();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, openCreateNodeModal, handlePaneClick, closeCreateNodeModal, handlePasteNodes, selectedNodesList, selectedNode]);

  // Edge style
  const defaultEdgeOptions = useMemo(() => ({
    type: 'custom',
    style: {
      stroke: 'rgba(139, 92, 246, 0.9)',
      strokeWidth: 4,
    },
    animated: true,
  }), []);

  // Track pointer for live cursor
  const handlePointerMove = useCallback((e) => {
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    lastMousePos.current = position;
    sendCursor(position.x, position.y);
  }, [screenToFlowPosition, sendCursor]);

  const handleEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setEdgeMenu({
      id: edge.id,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const handleNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setNodeMenu({
      node: node,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  const loading = useBoardStore(s => s.loading);
  const isDataLoaded = useBoardStore(s => s.nodes)[boardId] !== undefined;

  if (loading || (!board && !isDataLoaded)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent-violet)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Panonuz Yükleniyor...</h2>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="board-page" ref={reactFlowWrapper} onPointerMove={handlePointerMove}>
      <ReactFlow
        nodes={nodes}
        edges={edgesWithPaths}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={handlePaneContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={3}
        connectionLineType="bezier"
        connectionLineStyle={{ stroke: 'rgba(139, 92, 246, 0.9)', strokeWidth: 4 }}
        connectionRadius={40}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
        selectionOnDrag={isSelectionMode}
        panOnDrag={!isSelectionMode}
        selectionMode="partial"
        onSelectionStart={() => setIsLassoActive(true)}
        onSelectionEnd={() => setIsLassoActive(false)}
      >
        <StarBackground
          gap={24}
          size={5}
          color={theme === 'dark' ? "rgba(255, 255, 255, 0.04)" : "rgba(17, 24, 39, 0.08)"}
        />
      </ReactFlow>

      <CanvasToolbar
        onAddNode={() => openCreateNodeModal({ x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 })}
        onImportRoadmap={() => setImportModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        zoom={zoom}
        isSelectionMode={isSelectionMode}
        onToggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
      />

      {!isLassoActive && selectedNodesList.length > 1 ? (
        <MultiNodeDetailPanel
          nodes={selectedNodesList}
          boardId={boardId}
          onClose={() => {
            // Deselect all
            useBoardStore.getState().onNodesChange(boardId, selectedNodesList.map(n => ({ id: n.id, type: 'select', selected: false })));
          }}
          broadcast={broadcast}
        />
      ) : selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          boardId={boardId}
          onClose={handlePaneClick}
          broadcast={broadcast}
        />
      )}

      {createNodeModalOpen && <CreateNodeModal boardId={boardId} broadcast={broadcast} />}
      <RoadmapImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} boardId={boardId} />

      {/* Live Cursors */}
      {Object.entries(cursors).map(([id, cursor]) => {
        return null; 
      })}

      {edgeMenu && (
        <div
          style={{
            position: 'fixed',
            top: edgeMenu.y,
            left: edgeMenu.x,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
          }}
          onMouseLeave={() => setEdgeMenu(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              useBoardStore.getState().deleteEdge(boardId, edgeMenu.id);
              setEdgeMenu(null);
            }}
            style={{
              width: 24,
              height: 24,
              background: '#ef4444',
              border: '2px solid #1a1a28',
              cursor: 'pointer',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)';
              e.currentTarget.style.background = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = '#ef4444';
            }}
            title="Bağlantıyı Sil"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>
      )}

      {paneMenu && (
        <div
          className="glass"
          style={{
            position: 'fixed',
            top: paneMenu.y,
            left: paneMenu.x,
            zIndex: 1000,
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '180px'
          }}
          onMouseLeave={() => setPaneMenu(null)}
        >
          <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={async () => {
             const position = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
             setPaneMenu(null);
             const newNode = await addNode(boardId, { label: "Yeni Görev", nodeType: "taskNode", position, status: "todo", priority: "medium" });
             broadcast('node:create', { node_id: newNode.id });
             setTimeout(pushToHistory, 0);
          }}>
             <Plus size={14}/> Yeni Görev Ekle
          </button>
          <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={async () => {
             const position = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
             setPaneMenu(null);
             const newNode = await addNode(boardId, { label: "Yeni Not", nodeType: "wikiNode", position, status: "todo", priority: "medium" });
             broadcast('node:create', { node_id: newNode.id });
             setTimeout(pushToHistory, 0);
          }}>
             <FileText size={14}/> Yeni Not Ekle
          </button>
          <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={async () => {
             const position = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
             setPaneMenu(null);
             const newNode = await addNode(boardId, { label: "Yeni Milestone", nodeType: "milestoneNode", position, status: "todo", priority: "medium" });
             broadcast('node:create', { node_id: newNode.id });
             setTimeout(pushToHistory, 0);
          }}>
             <Target size={14}/> Yeni Milestone Ekle
          </button>
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
          <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={async () => {
             const position = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
             setPaneMenu(null);
             const newNode = await addNode(boardId, { label: "Başlangıç", nodeType: "startNode", position, status: "todo", priority: "medium" });
             broadcast('node:create', { node_id: newNode.id });
             setTimeout(pushToHistory, 0);
          }}>
             <PlayCircle size={14}/> Yeni Başlangıç Ekle
          </button>
          <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={async () => {
             const position = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
             setPaneMenu(null);
             const newNode = await addNode(boardId, { label: "Bitiş", nodeType: "endNode", position, status: "todo", priority: "medium" });
             broadcast('node:create', { node_id: newNode.id });
             setTimeout(pushToHistory, 0);
          }}>
             <StopCircle size={14}/> Yeni Bitiş Ekle
          </button>
          
          {localStorage.getItem('taskpath_clipboard') && (
            <>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <button className="btn btn-ghost btn-sm" style={{justifyContent: 'flex-start'}} onClick={() => {
                const clipboardData = localStorage.getItem('taskpath_clipboard');
                setPaneMenu(null);
                if (clipboardData) {
                  try {
                    const parsed = JSON.parse(clipboardData);
                    // Handle edge copy paste format if necessary, or just fallback to handlePasteNodes
                    const nodesToPaste = parsed.nodes ? parsed.nodes : parsed;
                    lastMousePos.current = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
                    handlePasteNodes(nodesToPaste, parsed.edges || []);
                  } catch(err) {}
                }
              }}>
                <ClipboardPaste size={14}/> Yapıştır
              </button>
            </>
          )}
        </div>
      )}

      {nodeMenu && (
        <div
          className="glass"
          style={{
            position: 'fixed',
            top: nodeMenu.y,
            left: nodeMenu.x,
            zIndex: 1000,
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: '150px'
          }}
          onMouseLeave={() => setNodeMenu(null)}
        >
          <button 
            className="btn btn-ghost btn-sm" 
            style={{justifyContent: 'flex-start'}} 
            onClick={() => { 
              const fullNode = nodes.find(n => n.id === nodeMenu.node.id);
              setSelectedNode(fullNode || nodeMenu.node); 
              setNodeMenu(null); 
            }}
          >
             <Edit2 size={14}/> Düzenle
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{justifyContent: 'flex-start'}} 
            onClick={() => { 
             const fullNode = nodes.find(n => n.id === nodeMenu.node.id);
             const isDone = fullNode?.data?.status === 'done';
             const newStatus = isDone ? 'todo' : 'done';
             useBoardStore.getState().updateNode(boardId, nodeMenu.node.id, { data: { status: newStatus } });
             setNodeMenu(null); 
            }}
          >
             <CheckCircle2 size={14} color={nodes.find(n => n.id === nodeMenu.node.id)?.data?.status === 'done' ? '#64748b' : '#10b981'}/> 
             {nodes.find(n => n.id === nodeMenu.node.id)?.data?.status === 'done' ? 'Geri Al' : 'Tamamla'}
          </button>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{justifyContent: 'flex-start'}} 
            onClick={() => { 
             const isMulti = selectedNodesList.some(n => n.id === nodeMenu.node.id);
             const toCopy = isMulti ? selectedNodesList : [nodes.find(n => n.id === nodeMenu.node.id) || nodeMenu.node];
             const toCopyIds = new Set(toCopy.map(n => n.id));
             const edgesToCopy = edges.filter(edge => toCopyIds.has(edge.source) && toCopyIds.has(edge.target));
             localStorage.setItem('taskpath_clipboard', JSON.stringify({ nodes: toCopy, edges: edgesToCopy }));
             toast.success(`${toCopy.length} görev kopyalandı`);
             setNodeMenu(null); 
            }}
          >
             <Copy size={14}/> Kopyala
          </button>
          <button 
            className="btn btn-danger btn-sm" 
            style={{justifyContent: 'flex-start'}} 
            onClick={() => { 
             const isMulti = selectedNodesList.some(n => n.id === nodeMenu.node.id);
             const toDelete = isMulti ? selectedNodesList : [nodeMenu.node];
             handleNodesDelete(toDelete);
             setNodeMenu(null); 
            }}
          >
             <Trash size={14}/> Sil
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider
export default function BoardPage() {
  return (
    <ReactFlowProvider>
      <ErrorBoundary fallbackTitle="Pano Yüklenirken Hata Oluştu">
        <BoardCanvas />
      </ErrorBoundary>
    </ReactFlowProvider>
  );
}
