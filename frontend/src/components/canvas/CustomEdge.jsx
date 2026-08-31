import React from 'react';
import { BaseEdge, useStore, getSmoothStepPath } from '@xyflow/react';
import { useParams } from 'react-router-dom';
import useBoardStore from '../../stores/boardStore';
import { generateSvgPath } from './smartEdgeUtil';

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  data,
}) {
  // Get all nodes from React Flow's internal store
  const nodes = useStore((s) => s.nodes);
  
  const sourceNode = nodes.find(n => n.id === source);
  const targetNode = nodes.find(n => n.id === target);
  
  let edgePath = generateSvgPath(sourceX, sourceY, targetX, targetY, data?.smartPathPoints);

  if (!edgePath) {
    [edgePath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }

  // Calculate dynamic z-index to ensure edge is visible at the borders of the nodes it connects
  const zIndex = Math.max(sourceNode?.zIndex || 0, targetNode?.zIndex || 0) + 1;

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: selected ? 4 : 3, zIndex }} interactionWidth={30} />
    </>
  );
}
