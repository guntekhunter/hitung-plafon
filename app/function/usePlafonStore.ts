import { create } from "zustand";

// Constants
export const PANEL_WIDTH_METERS = 0.2; // 20cm in meters
export const SCALE = 50; // 50 pixels = 1 meter (Calibration)

interface Point {
  x: number;
  y: number;
}

export type CeilingType = 'flat' | 'drop1' | 'drop2';

interface PlafonState {
  points: Point[]; // The corners of the ceiling
  isClosed: boolean; // Is the shape finished?
  dropDepth: number; // Height of the drop (e.g., 0.15m)
  edgeOffset: number; // Width of the border (e.g., 0.6m)

  // New States for Multi-Drop
  ceilingType: CeilingType;
  secondEdgeOffset: number; // For Drop 2

  // NEW: Colors
  primaryColor: string;

  secondaryColor: string;
  primaryTexture: string;
  secondaryTexture: string;

  // NEW: Direction
  direction: 'horizontal' | 'vertical';

  // Actions
  addPoint: (x: number, y: number) => void;
  updatePoint: (index: number, x: number, y: number) => void;
  setDropDepth: (depth: number) => void;
  setEdgeOffset: (offset: number) => void;
  setCeilingType: (type: CeilingType) => void;
  setSecondEdgeOffset: (offset: number) => void;
  // NEW: Set colors
  setColors: (primary: string, secondary: string) => void;
  setTextures: (primary: string, secondary: string) => void;
  setDirection: (direction: 'horizontal' | 'vertical') => void;
  updateEdgeLength: (index: number, newLengthMeters: number) => void;

  getOffsetPoints: (offsetOverride?: number) => Point[];
  reset: () => void;

  // The Calculator
  calculateMaterials: () => {
    area: number;
    perimeter: number;
    rows: number;
    boards4m: number;
    boards6m: number;
    dropMaterialArea: number;

    // Breakdown
    level1Area: number; // Main/Border
    level2Area: number; // Middle (if Drop 2)
    level3Area: number; // Center

    // Consolidated Material Needs
    primaryUsage: { area: number, boards4m: number, boards6m: number };
    secondaryUsage: { area: number, boards4m: number, boards6m: number };
    lisDindingCount: number;
    lisSikuCount: number;
  };
}

export const usePlafonStore = create<PlafonState>((set, get) => ({
  points: [],
  isClosed: false,
  dropDepth: 0.15,
  edgeOffset: 0.60,
  ceilingType: 'drop1', // Default to Drop 1 as per current visual
  secondEdgeOffset: 0.40,

  // NEW Defaults: White and a light wood color
  primaryColor: '#ffffff',

  secondaryColor: '#e2c7a5',
  primaryTexture: '1.png',
  secondaryTexture: '2.png',
  direction: 'horizontal',

  addPoint: (x, y) =>
    set((state) => {
      if (state.isClosed) return state;
      // Close shape if clicking near start
      if (state.points.length > 2) {
        const start = state.points[0];
        const dist = Math.hypot(start.x - x, start.y - y);
        if (dist < 20) return { isClosed: true };
      }
      return { points: [...state.points, { x, y }] };
    }),

  updatePoint: (index, x, y) =>
    set((state) => {
      const newPoints = [...state.points];
      newPoints[index] = { x, y };
      return { points: newPoints };
    }),

  setDropDepth: (d) => set({ dropDepth: d }),
  setEdgeOffset: (o) => set({ edgeOffset: o }),
  setCeilingType: (t) => set({ ceilingType: t }),
  setSecondEdgeOffset: (o) => set({ secondEdgeOffset: o }),
  setColors: (primary, secondary) => set({ primaryColor: primary, secondaryColor: secondary }),
  setTextures: (primary, secondary) => set({ primaryTexture: primary, secondaryTexture: secondary }),
  setDirection: (d) => set({ direction: d }),

  updateEdgeLength: (index, newLengthMeters) =>
    set((state) => {
      const { points, isClosed } = state;
      if (!isClosed || points.length < 3) return state;

      const p1 = points[index];
      const p2Index = (index + 1) % points.length;
      const p2 = points[p2Index];

      // Current vector and length
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const currentLenPx = Math.hypot(dx, dy);
      const currentLenM = currentLenPx / SCALE;

      if (currentLenM === 0) return state;

      // Calculate difference
      const newLenPx = newLengthMeters * SCALE;
      const ratio = newLenPx / currentLenPx;

      // We want to extend the edge p1->p2.
      // Usually this means moving p2 and everything after it.
      // Shift Vector
      const shiftX = dx * (ratio - 1);
      const shiftY = dy * (ratio - 1);

      const newPoints = [...points];

      // Move p2 and all subsequent points (excluding p1)
      // To preserve the shape relative to p1-p2, we shift all subsequent vertices.
      // The last edge connecting back to p0 will change.

      // If we are modifying the last edge (index = len-1), p2 is p0.
      // Shifting p0 might shift the whole shape or we just move p0?
      // Let's stick to "Shift p2 and all following indices until length-1".
      // If index is last, p2 is 0. Moving 0 moves everything... that's just moving the shape.
      // Actually, standard behavior: Move P2. And move P3..Pn to keep P2-P3.. relationships constant?
      // Yes, translate the subset [p2, p3... p_last].

      // Logic:
      // P1 stays fixed.
      // P2 moves by Shift.
      // P3 moves by Shift...
      // ...
      // P_last moves by Shift.
      // P0 stays fixed (if P1!=P0).

      // Special case: Closing edge. 
      // If we change length of P_last -> P0. P1 is P0.
      // Moving P0 (if it's the start) implies moving the whole polygon if we view P0 as anchor.
      // But P0 is usually "Start".
      // Let's assume we move the 'Target' point of the edge.
      // So for Edge(i): P(i) -> P(i+1). We move P(i+1) and everything "downstream" in the array?
      // But "downstream" is circular.
      // Let's define: Move P(i+1)...P(points.length-1).
      // If i == points.length - 1, P(i+1) is P0. We can't move P0 because it's the anchor?
      // Or we can move P0, but then we must NOT move P1, P2...
      // Let's just refuse to edit the last closing edge for simplicity if it complicates "Anchor".
      // OR: Move P(i+1) and all subsequent points UP TO P(index-1)? No.

      // Simple implementation:
      // Allow moving P(i+1) through P(length-1).
      // This works for edges 0, 1, ... length-2.
      // For edge length-1 (closing loop to 0), we would need to move P0.
      // But P0 is the start. 
      // If we move P0, we effectively just rotate/scale the last edge?
      // Let's try simple shift of [p2Index ... points.length - 1].

      if (index === points.length - 1) {
        // Editing last edge. Target is P0.
        // We generally want to keep P0 fixed as origin.
        // So maybe we move P(n-1) backwards?
        // i.e. shiftX = -shiftX? 
        // Let's skip implementing last edge editing for this iteration to ensure stability, 
        // or try moving P(n-1) in opposite direction.

        // Let's Move P(index) (the start of this edge) "backwards".
        // Vector P(n-1) -> P0.
        // Extend it by pushing P(n-1) away from P0.
        const backShiftX = -shiftX;
        const backShiftY = -shiftY;
        newPoints[index] = {
          x: newPoints[index].x + backShiftX,
          y: newPoints[index].y + backShiftY
        };
        // And we also need to move all previous points? P(n-2)...?
        // This gets complex geometry-wise.
        // Let's just support 0 to length-2 (Forward shift) for now.
        return state;
      }

      for (let k = p2Index; k < points.length; k++) {
        newPoints[k] = {
          x: newPoints[k].x + shiftX,
          y: newPoints[k].y + shiftY
        };
      }

      return { points: newPoints };
    }),

  reset: () => set({ points: [], isClosed: false }),

  // Helper to calculate inner points
  getOffsetPoints: (offsetOverride) => {
    const { points, isClosed, edgeOffset } = get();
    if (!isClosed || points.length < 3) return [];

    const effectiveOffset = offsetOverride !== undefined ? offsetOverride : edgeOffset;
    const offsetPixels = effectiveOffset * SCALE;
    const result = [];
    const len = points.length;

    // ... (Same geometric logic as before, just using offsetPixels)
    // To keep it clean, I'll copy the robust logic I wrote previously

    // Determine polygon winding (signed area) NOT needed for loop logic but for inset check
    // ...

    for (let i = 0; i < len; i++) {
      const prev = points[(i - 1 + len) % len];
      const curr = points[i];
      const next = points[(i + 1) % len];

      let v1x = curr.x - prev.x;
      let v1y = curr.y - prev.y;
      let v2x = next.x - curr.x;
      let v2y = next.y - curr.y;

      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);
      v1x /= len1; v1y /= len1;
      v2x /= len2; v2y /= len2;

      let n1x = -v1y;
      let n1y = v1x;
      let n2x = -v2y;
      let n2y = v2x;

      const p1x = prev.x + n1x * offsetPixels;
      const p1y = prev.y + n1y * offsetPixels;
      const p2x = curr.x + n1x * offsetPixels;
      const p2y = curr.y + n1y * offsetPixels;

      const p3x = curr.x + n2x * offsetPixels;
      const p3y = curr.y + n2y * offsetPixels;
      const p4x = next.x + n2x * offsetPixels;
      const p4y = next.y + n2y * offsetPixels;

      const det = (p2x - p1x) * (p4y - p3y) - (p4x - p3x) * (p2y - p1y);
      if (Math.abs(det) < 0.001) {
        result.push({ x: curr.x + n1x * offsetPixels, y: curr.y + n1y * offsetPixels });
        continue;
      }

      const t = ((p3x - p1x) * (p4y - p3y) - (p3y - p1y) * (p4x - p3x)) / det;
      const ix = p1x + t * (p2x - p1x);
      const iy = p1y + t * (p2y - p1y);

      result.push({ x: ix, y: iy });
    }

    // Check if we expanded or contracted.
    let areaOrig = 0;
    let areaNew = 0;
    for (let i = 0; i < len; i++) {
      areaOrig += points[i].x * points[(i + 1) % len].y - points[(i + 1) % len].x * points[i].y;
      areaNew += result[i].x * result[(i + 1) % len].y - result[(i + 1) % len].x * result[i].y;
    }
    areaOrig = Math.abs(areaOrig);
    areaNew = Math.abs(areaNew);

    if (areaNew > areaOrig) {
      const negResult = [];
      const negPixels = -offsetPixels;
      // Same loop for negative...
      for (let i = 0; i < len; i++) {
        const prev = points[(i - 1 + len) % len];
        const curr = points[i];
        const next = points[(i + 1) % len];

        let v1x = curr.x - prev.x;
        let v1y = curr.y - prev.y;
        let v2x = next.x - curr.x;
        let v2y = next.y - curr.y;

        const len1 = Math.hypot(v1x, v1y);
        const len2 = Math.hypot(v2x, v2y);
        v1x /= len1; v1y /= len1;
        v2x /= len2; v2y /= len2;

        let n1x = -v1y;
        let n1y = v1x;
        let n2x = -v2y;
        let n2y = v2x;

        const p1x = prev.x + n1x * negPixels;
        const p1y = prev.y + n1y * negPixels;
        const p2x = curr.x + n1x * negPixels;
        const p2y = curr.y + n1y * negPixels;

        const p3x = curr.x + n2x * negPixels;
        const p3y = curr.y + n2y * negPixels;
        const p4x = next.x + n2x * negPixels;
        const p4y = next.y + n2y * negPixels;

        const det = (p2x - p1x) * (p4y - p3y) - (p4x - p3x) * (p2y - p1y);
        if (Math.abs(det) < 0.001) {
          negResult.push({ x: curr.x + n1x * negPixels, y: curr.y + n1y * negPixels });
          continue;
        }
        const t = ((p3x - p1x) * (p4y - p3y) - (p3y - p1y) * (p4x - p3x)) / det;
        negResult.push({ x: p1x + t * (p2x - p1x), y: p1y + t * (p2y - p1y) });
      }
      return negResult;
    }

    return result;
  },

  calculateMaterials: () => {
    const { points, isClosed, dropDepth, ceilingType, edgeOffset, secondEdgeOffset } = get();
    // @ts-ignore
    const getOffset = get().getOffsetPoints;

    if (!isClosed || points.length < 3)
      return {
        area: 0,
        perimeter: 0,
        rows: 0,
        boards4m: 0,
        boards6m: 0,
        dropMaterialArea: 0,
        level1Area: 0,
        level2Area: 0,
        level3Area: 0,
        primaryUsage: { area: 0, boards4m: 0, boards6m: 0 },
        secondaryUsage: { area: 0, boards4m: 0, boards6m: 0 },
        lisDindingCount: 0,
        lisSikuCount: 0
      };

    const getArea = (pts: Point[]) => {
      let a = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        a += pts[i].x * pts[j].y;
        a -= pts[j].x * pts[i].y;
      }
      return Math.abs(a) / 2 / (SCALE * SCALE);
    };

    const getPerim = (pts: Point[]) => {
      let p = 0;
      for (let i = 0; i < pts.length; i++) {
        const j = (i + 1) % pts.length;
        p += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      }
      return p / SCALE;
    }

    const totalArea = getArea(points);
    let level1Area = 0;
    let level2Area = 0;
    let level3Area = 0; // The innermost
    let dropMaterialArea = 0;

    if (ceilingType === 'flat') {
      level1Area = totalArea;
      // No drops
    } else if (ceilingType === 'drop1') {
      // One offset
      const innerPoints = getOffset(edgeOffset);
      const innerArea = getArea(innerPoints);

      level1Area = totalArea - innerArea; // Main Border
      level2Area = innerArea; // The Drop center

      dropMaterialArea = getPerim(innerPoints) * dropDepth;

    } else if (ceilingType === 'drop2') {
      // Two offsets
      // Offset 1
      const offset1Points = getOffset(edgeOffset);
      const offset1Area = getArea(offset1Points);

      // Offset 2 (total offset = offset1 + offset2)
      const offset2Points = getOffset(edgeOffset + secondEdgeOffset);
      const offset2Area = getArea(offset2Points);

      level1Area = totalArea - offset1Area; // Utmost Border
      level2Area = offset1Area - offset2Area; // Middle Tier
      level3Area = offset2Area; // Innermost

      // Vertical Logic:
      // Drop 1 Perimeter (at offset 1)
      // Drop 2 Perimeter (at offset 2)
      dropMaterialArea = (getPerim(offset1Points) * dropDepth) + (getPerim(offset2Points) * dropDepth);
    }

    // Material estimation (Rows & Boards) - simplified based on Total Area/Footprint for now?
    // Usually you estimate based on the flat area, but here we just keep the simple heuristic based on Total Width.
    // Real calculation would need to slice each polygon.
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const widthMeters = (maxX - minX) / SCALE;
    const heightMeters = (maxY - minY) / SCALE;

    const { direction } = get();
    let numPanelsLine = 0; // "Rows" or "Columns"
    let lengthPerPanel = 0;

    if (direction === 'vertical') {
      // Panels run vertical (Top to Bottom)
      // Number of lines determined by Width
      numPanelsLine = Math.ceil(widthMeters / PANEL_WIDTH_METERS);
      lengthPerPanel = heightMeters;
    } else {
      // Horizontal (Default)
      // Panels run horizontal (Left to Right)
      // Number of lines determined by Height
      numPanelsLine = Math.ceil(heightMeters / PANEL_WIDTH_METERS);
      lengthPerPanel = widthMeters;
    }

    // Reuse "rows" field for "lines count"
    const numRows = numPanelsLine;

    // Base Boards (Flat Footprint Coverage)
    let baseBoards4m = 0;
    let baseBoards6m = 0;

    // Check against the LENGTH of the panel needed
    if (lengthPerPanel <= 4) baseBoards4m = numRows;
    else if (lengthPerPanel <= 6) baseBoards6m = numRows;
    else baseBoards6m = numRows; // Fallback to 6m for large spans

    // Calculate specific areas for each "Material Type"
    const primaryMatArea = level1Area + level3Area;
    const secondaryMatArea = level2Area + dropMaterialArea;
    const totalMatArea = primaryMatArea + secondaryMatArea;

    // Scaling Factor: (Actual Surface Area / Flat Footprint Area)
    // Avoid division by zero
    const footprintArea = totalArea || 1;
    const verticalFactor = (totalArea + dropMaterialArea) / footprintArea;

    // Adjust total boards needed to account for vertical drops
    const totalBoards4m = Math.ceil(baseBoards4m * verticalFactor);
    const totalBoards6m = Math.ceil(baseBoards6m * verticalFactor);

    // Now split by Primary vs Secondary Area ratio
    const totalSurfaceArea = primaryMatArea + secondaryMatArea;
    const primaryRatio = totalSurfaceArea > 0 ? primaryMatArea / totalSurfaceArea : 1;
    const secondaryRatio = totalSurfaceArea > 0 ? secondaryMatArea / totalSurfaceArea : 0;

    return {
      area: totalArea,
      perimeter: getPerim(points),
      rows: numRows,
      boards4m: totalBoards4m,
      boards6m: totalBoards6m,
      dropMaterialArea,
      level1Area,
      level2Area,
      level3Area,
      primaryUsage: {
        area: primaryMatArea,
        boards4m: Math.ceil(totalBoards4m * primaryRatio),
        boards6m: Math.ceil(totalBoards6m * primaryRatio)
      },
      secondaryUsage: {
        area: secondaryMatArea,
        boards4m: Math.ceil(totalBoards4m * secondaryRatio),
        boards6m: Math.ceil(totalBoards6m * secondaryRatio)
      },
      lisDindingCount: Math.ceil(getPerim(points) / 4),
      lisSikuCount: (() => {
        if (ceilingType === 'drop1') {
          return Math.ceil(getPerim(getOffset(edgeOffset)) / 4);
        } else if (ceilingType === 'drop2') {
          return Math.ceil((getPerim(getOffset(edgeOffset)) + getPerim(getOffset(edgeOffset + secondEdgeOffset))) / 4);
        }
        return 0;
      })()
    };
  },
}));

