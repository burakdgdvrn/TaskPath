import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  MousePointer2,
  Wand2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export default function CanvasToolbar({ onAddNode, onUndo, onRedo, canUndo, canRedo, zoom, isSelectionMode, onToggleSelectionMode, onImportRoadmap }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="canvas-toolbar">
      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onAddNode}
        title="Yeni Görev (N)"
      >
        <Plus />
      </button>

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onImportRoadmap}
        title="Sihirli İçe Aktar"
      >
        <Wand2 />
      </button>
      
      <button
        className={`btn btn-icon btn-sm ${isSelectionMode ? 'btn-primary' : 'btn-ghost'}`}
        onClick={onToggleSelectionMode}
        title="Çoklu Seçim Modu (Lasso)"
      >
        <MousePointer2 />
      </button>

      <div className="divider" />

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onUndo}
        disabled={!canUndo}
        title="Geri Al (Ctrl+Z)"
      >
        <Undo2 />
      </button>

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={onRedo}
        disabled={!canRedo}
        title="İleri Al (Ctrl+Y)"
      >
        <Redo2 />
      </button>

      <div className="divider" />

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => zoomOut({ duration: 200 })}
        title="Uzaklaştır"
      >
        <ZoomOut />
      </button>

      <span className="zoom-display">{Math.round(zoom * 100)}%</span>

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => zoomIn({ duration: 200 })}
        title="Yakınlaştır"
      >
        <ZoomIn />
      </button>

      <button
        className="btn btn-ghost btn-icon btn-sm"
        onClick={() => fitView({ duration: 300, padding: 0.2 })}
        title="Sığdır"
      >
        <Maximize />
      </button>
    </div>
  );
}
