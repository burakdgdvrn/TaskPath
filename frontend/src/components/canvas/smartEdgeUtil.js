import PF from 'pathfinding';

export function computeAllEdgeRoutes(nodes, edges) {
  const gridSize = 20;
  
  // 1. Find boundaries
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    if (node.position && node.measured) {
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + node.measured.width);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y + node.measured.height);
    }
  });

  if (minX === Infinity) return {};

  const padding = 100;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  const width = Math.ceil((maxX - minX) / gridSize);
  const height = Math.ceil((maxY - minY) / gridSize);
  if (width * height > 1000000 || width <= 0 || height <= 0) return {};

  const grid = new PF.Grid(width, height);

  // Mark all nodes as obstacles (static obstacles)
  const nodePadding = 20; // Base 20px padding
  nodes.forEach(node => {
    if (node.position && node.measured) {
      const startCol = Math.max(0, Math.floor((node.position.x - nodePadding - minX) / gridSize));
      const endCol = Math.min(width - 1, Math.ceil((node.position.x + node.measured.width + nodePadding - minX) / gridSize));
      const startRow = Math.max(0, Math.floor((node.position.y - nodePadding - minY) / gridSize));
      const endRow = Math.min(height - 1, Math.ceil((node.position.y + node.measured.height + nodePadding - minY) / gridSize));

      for (let y = startRow; y <= endRow; y++) {
        for (let x = startCol; x <= endCol; x++) {
          grid.setWalkableAt(x, y, false);
        }
      }
    }
  });

  const rawPaths = {};
  const segmentOccupancy = {}; // "x1,y1-x2,y2" -> [edgeId1, edgeId2]

  const getManhattanDist = (edge) => {
    const s = nodes.find(n => n.id === edge.source);
    const t = nodes.find(n => n.id === edge.target);
    if (!s || !t) return 0;
    return Math.abs(t.position.x - s.position.x) + Math.abs(t.position.y - s.position.y);
  };

  const sortedEdges = [...edges].sort((a, b) => getManhattanDist(a) - getManhattanDist(b));

  // Compute raw paths
  for (const edge of sortedEdges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode || !sourceNode.measured || !targetNode.measured) continue;

    // Approximate handle positions for routing grid
    const sourceX = sourceNode.position.x + sourceNode.measured.width;
    const sourceY = sourceNode.position.y + sourceNode.measured.height / 2;
    const targetX = targetNode.position.x;
    const targetY = targetNode.position.y + targetNode.measured.height / 2;

    const startXGrid = Math.max(0, Math.min(width - 1, Math.floor((sourceX - minX) / gridSize)));
    const startYGrid = Math.max(0, Math.min(height - 1, Math.floor((sourceY - minY) / gridSize)));
    const endXGrid = Math.max(0, Math.min(width - 1, Math.floor((targetX - minX) / gridSize)));
    const endYGrid = Math.max(0, Math.min(height - 1, Math.floor((targetY - minY) / gridSize)));

    // Temporarily punch holes for start/end
    const safeRadius = 2; // 2 cells
    const backupWalkable = [];
    
    for (let y = Math.max(0, startYGrid - safeRadius); y <= Math.min(height - 1, startYGrid + safeRadius); y++) {
      for (let x = Math.max(0, startXGrid - safeRadius); x <= Math.min(width - 1, startXGrid + safeRadius); x++) {
        backupWalkable.push({ x, y, walkable: grid.isWalkableAt(x, y) });
        grid.setWalkableAt(x, y, true);
      }
    }
    for (let y = Math.max(0, endYGrid - safeRadius); y <= Math.min(height - 1, endYGrid + safeRadius); y++) {
      for (let x = Math.max(0, endXGrid - safeRadius); x <= Math.min(width - 1, endXGrid + safeRadius); x++) {
        backupWalkable.push({ x, y, walkable: grid.isWalkableAt(x, y) });
        grid.setWalkableAt(x, y, true);
      }
    }

    const finder = new PF.AStarFinder({ allowDiagonal: false, dontCrossCorners: true });
    let path = finder.findPath(startXGrid, startYGrid, endXGrid, endYGrid, grid.clone());

    // Restore grid
    backupWalkable.forEach(cell => grid.setWalkableAt(cell.x, cell.y, cell.walkable));

    if (path.length > 0) {
      path = PF.Util.compressPath(path);
      rawPaths[edge.id] = path;

      // Record segments for overlap detection
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        const seg = `${p1[0]},${p1[1]}-${p2[0]},${p2[1]}`;
        const revSeg = `${p2[0]},${p2[1]}-${p1[0]},${p1[1]}`;
        // Treat both directions as the same segment for occupancy
        const key = [seg, revSeg].sort().join('|');
        if (!segmentOccupancy[key]) segmentOccupancy[key] = [];
        if (!segmentOccupancy[key].includes(edge.id)) {
          segmentOccupancy[key].push(edge.id);
        }
      }
    }
  }

  // Calculate offsets and generate actual points
  const edgePoints = {};
  for (const edge of edges) {
    const path = rawPaths[edge.id];
    if (!path) continue;

    const points = [];
    for (let i = 0; i < path.length; i++) {
      let ptX = path[i][0] * gridSize + minX + (gridSize / 2);
      let ptY = path[i][1] * gridSize + minY + (gridSize / 2);

      // Offset points based on segments they belong to.
      let refSegIndex = i < path.length - 1 ? i : i - 1;
      if (refSegIndex >= 0) {
        const p1 = path[refSegIndex];
        const p2 = path[refSegIndex + 1];
        const seg = `${p1[0]},${p1[1]}-${p2[0]},${p2[1]}`;
        const revSeg = `${p2[0]},${p2[1]}-${p1[0]},${p1[1]}`;
        const key = [seg, revSeg].sort().join('|');
        
        const edgesOnSegment = segmentOccupancy[key] || [];
        // Edges were processed in order of length, so index naturally gives shorter edges the inner lanes
        const laneIndex = edgesOnSegment.indexOf(edge.id);
        
        if (laneIndex > 0) { // Offset needed
          // Determine perpendicular direction
          const dx = Math.sign(p2[0] - p1[0]);
          const dy = Math.sign(p2[1] - p1[1]);
          // Perpendicular: (-dy, dx)
          const px = -dy;
          const py = dx;
          
          const offsetAmount = 8; // 8px per lane
          // Shift lane 1 by +8, lane 2 by -8, lane 3 by +16, etc.
          const sign = laneIndex % 2 === 1 ? 1 : -1;
          const shift = Math.ceil(laneIndex / 2) * offsetAmount * sign;
          
          ptX += px * shift;
          ptY += py * shift;
        }
      }
      
      points.push({ x: ptX, y: ptY });
    }
    edgePoints[edge.id] = points;
  }

  return edgePoints;
}

export function generateSvgPath(sourceX, sourceY, targetX, targetY, points) {
  if (!points || points.length === 0) return null;
  let d = `M ${sourceX} ${sourceY} `;
  points.forEach((pt) => {
    d += `L ${pt.x} ${pt.y} `;
  });
  d += `L ${targetX} ${targetY}`;
  return d;
}
