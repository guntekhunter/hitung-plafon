import { create } from "zustand";
import {
  OptimizationResult,
  optimizeCuts,
  runScenarioComparison
} from './materialOptimizer';

// Constants
export const PANEL_WIDTH_METERS = 0.2; // 20cm in meters
export const SCALE = 100; // 1 meter = 100 pixels

interface Point {
  x: number;
  y: number;
}

export type CeilingType = 'flat' | 'drop1' | 'drop2';

export interface Shape {
  id: string;
  type: 'room' | 'trap';
  points: Point[];
  isClosed: boolean;
  direction: 'horizontal' | 'vertical';
  ceilingType: CeilingType;
  dropDepth: number;
  edgeOffset: number;
  secondEdgeOffset: number;
  primaryColor: string;
  secondaryColor: string;
  primaryTexture: string | null;
  secondaryTexture: string | null;
}

export type BoardPreference = '4m' | '6m' | 'both';

interface PlafonState {
  shapes: Shape[];
  activeShapeId: string | null;
  boardPreference: BoardPreference;
  setBoardPreference: (pref: BoardPreference) => void;

  // Actions
  addShape: (type: 'room' | 'trap') => void;
  deleteShape: (id: string) => void;
  setActiveShape: (id: string | null) => void;
  addPoint: (x: number, y: number) => void;
  updatePoint: (shapeId: string, index: number, x: number, y: number) => void;
  updateShapeProperty: (shapeId: string, property: string, value: any) => void;
  updateEdgeLength: (shapeId: string, index: number, newLengthMeters: number) => void;

  getOffsetPoints: (shapeId: string, offsetOverride?: number) => Point[];
  reset: () => void;

  // The Calculator
  calculateMaterials: () => {
    totalArea: number;
    totalPerimeter: number;
    totalVerticalArea: number;
    totalPrimaryArea: number;
    totalSecondaryArea: number;
    totalLisDinding: number;
    totalLisSiku: number;
    outerOptimization: OptimizationResult;
    innerOptimization: OptimizationResult;
    shapesBreakdown: any[];
  };
}

const createDefaultShape = (type: 'room' | 'trap'): Shape => ({
  id: Math.random().toString(36).substr(2, 9),
  type,
  points: [],
  isClosed: false,
  dropDepth: 0.15,
  edgeOffset: type === 'room' ? 0.60 : 0,
  ceilingType: type === 'room' ? 'drop1' : 'flat',
  secondEdgeOffset: 0.40,
  primaryColor: '#ffffff',
  secondaryColor: '#e2c7a5',
  primaryTexture: null,
  secondaryTexture: null,
  direction: 'horizontal',
});

export const usePlafonStore = create<PlafonState>((set, get) => ({
  shapes: [],
  activeShapeId: null, // Will be set on first interaction or explicitly
  boardPreference: 'both',

  setBoardPreference: (boardPreference) => set({ boardPreference }),

  addShape: (type) => set((state) => {
    const newShape = createDefaultShape(type);
    return {
      shapes: [...state.shapes, newShape],
      activeShapeId: newShape.id
    };
  }),

  deleteShape: (id) => set((state) => ({
    shapes: state.shapes.filter(s => s.id !== id),
    activeShapeId: state.activeShapeId === id ? null : state.activeShapeId
  })),

  setActiveShape: (id) => set({ activeShapeId: id }),

  addPoint: (x, y) =>
    set((state) => {
      const activeId = state.activeShapeId || state.shapes[0]?.id;
      if (!activeId) return state;

      const newShapes = state.shapes.map(shape => {
        if (shape.id !== activeId || shape.isClosed) return shape;

        // Close shape if clicking near start
        if (shape.points.length > 2) {
          const start = shape.points[0];
          const dist = Math.hypot(start.x - x, start.y - y);
          if (dist < 20) return { ...shape, isClosed: true };
        }
        return { ...shape, points: [...shape.points, { x, y }] };
      });

      return { shapes: newShapes, activeShapeId: activeId };
    }),

  updatePoint: (shapeId, index, x, y) =>
    set((state) => ({
      shapes: state.shapes.map(s => {
        if (s.id !== shapeId) return s;
        const newPoints = [...s.points];
        newPoints[index] = { x, y };
        return { ...s, points: newPoints };
      })
    })),

  updateShapeProperty: (shapeId, property, value) =>
    set((state) => ({
      shapes: state.shapes.map(s => s.id === shapeId ? { ...s, [property]: value } : s)
    })),

  updateEdgeLength: (shapeId, index, newLengthMeters) =>
    set((state) => {
      const shape = state.shapes.find(s => s.id === shapeId);
      if (!shape || !shape.isClosed || shape.points.length < 3) return state;

      const { points } = shape;
      const p1 = points[index];
      const p2Index = (index + 1) % points.length;
      const p2 = points[p2Index];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const currentLenPx = Math.hypot(dx, dy);
      const currentLenM = currentLenPx / SCALE;

      if (currentLenM === 0) return state;

      const newLenPx = newLengthMeters * SCALE;
      const ratio = newLenPx / currentLenPx;
      const shiftX = dx * (ratio - 1);
      const shiftY = dy * (ratio - 1);

      const newPoints = [...points];

      // Stability: Move all subsequent points
      if (index === points.length - 1) {
        return state;
      }

      for (let k = p2Index; k < points.length; k++) {
        newPoints[k] = {
          x: newPoints[k].x + shiftX,
          y: newPoints[k].y + shiftY
        };
      }

      return {
        shapes: state.shapes.map(s => s.id === shapeId ? { ...s, points: newPoints } : s)
      };
    }),

  reset: () => set({ shapes: [], activeShapeId: null }),

  getOffsetPoints: (shapeId, offsetOverride) => {
    const shape = get().shapes.find(s => s.id === shapeId);
    if (!shape || !shape.isClosed || shape.points.length < 3) return [];

    const effectiveOffset = offsetOverride !== undefined ? offsetOverride : shape.edgeOffset;
    if (effectiveOffset === 0) return [];

    const offsetPixels = effectiveOffset * SCALE;
    const { points } = shape;
    const result = [];
    const len = points.length;

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
      if (len1 === 0 || len2 === 0) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }

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
      result.push({ x: p1x + t * (p2x - p1x), y: p1y + t * (p2y - p1y) });
    }

    // Winding check
    let areaOrig = 0;
    let areaNew = 0;
    for (let i = 0; i < len; i++) {
      areaOrig += points[i].x * points[(i + 1) % len].y - points[(i + 1) % len].x * points[i].y;
      areaNew += result[i].x * result[(i + 1) % len].y - result[(i + 1) % len].x * result[i].y;
    }
    if (Math.abs(areaNew) > Math.abs(areaOrig)) {
      // Reverse offset logic (simplified for brevity, should be robust)
      return get().getOffsetPoints(shapeId, -effectiveOffset);
    }

    return result;
  },

  calculateMaterials: () => {
    const { shapes } = get();
    let totalArea = 0;
    let totalPerimeter = 0;
    let totalVerticalArea = 0;
    let totalPrimaryArea = 0;
    let totalSecondaryArea = 0;
    let totalLisDindingValue = 0;
    let totalLisSikuValue = 0;
    const outerCuts: number[] = [];
    const innerCuts: number[] = [];

    const shapesBreakdown = shapes.filter(s => s.isClosed).map(shape => {
      // Helper: Geometric Strip Generation (Simplified for 1D cutting stock)
      // This calculates the lengths of strips needed to cover the polygon.
      const getRequiredCuts = (pts: Point[], excludePtsList: Point[][] = []) => {
        if (pts.length < 3) return [];
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const cuts: number[] = [];
        const step = PANEL_WIDTH_METERS * SCALE;

        const processIntersections = (polygon: Point[], yOrX: number, isHorizontal: boolean) => {
          const inters: number[] = [];
          for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            if (isHorizontal) {
              if ((p1.y <= yOrX && p2.y > yOrX) || (p2.y <= yOrX && p1.y > yOrX)) {
                inters.push(p1.x + (yOrX - p1.y) * (p2.x - p1.x) / (p2.y - p1.y));
              }
            } else {
              if ((p1.x <= yOrX && p2.x > yOrX) || (p2.x <= yOrX && p1.x > yOrX)) {
                inters.push(p1.y + (yOrX - p1.x) * (p2.y - p1.y) / (p2.x - p1.x));
              }
            }
          }
          return inters.sort((a, b) => a - b);
        };

        if (shape.direction === 'horizontal') {
          for (let y = minY + step / 2; y < maxY; y += step) {
            let mainSegments = processIntersections(pts, y, true);
            const excludeSegments = excludePtsList.flatMap(ex => processIntersections(ex, y, true));

            // Subtract exclude segments from main segments
            // This is a simple 1D segment subtraction
            for (let i = 0; i < mainSegments.length; i += 2) {
              let start = mainSegments[i];
              let end = mainSegments[i + 1];
              if (!end) continue;

              // Sort excludes for this specific row
              const rowExcludes = excludeSegments.slice().sort((a, b) => a - b);
              let currentStart = start;

              for (let j = 0; j < rowExcludes.length; j += 2) {
                const exStart = rowExcludes[j];
                const exEnd = rowExcludes[j + 1];
                if (!exEnd) continue;

                if (exStart > currentStart && exStart < end) {
                  // We have a gap
                  cuts.push(parseFloat(((exStart - currentStart) / SCALE).toFixed(4)));
                  currentStart = exEnd;
                } else if (exStart <= currentStart && exEnd > currentStart) {
                  currentStart = Math.max(currentStart, exEnd);
                }
              }
              if (currentStart < end) {
                cuts.push(parseFloat(((end - currentStart) / SCALE).toFixed(4)));
              }
            }
          }
        } else {
          for (let x = minX + step / 2; x < maxX; x += step) {
            let mainSegments = processIntersections(pts, x, false);
            const excludeSegments = excludePtsList.flatMap(ex => processIntersections(ex, x, false));

            for (let i = 0; i < mainSegments.length; i += 2) {
              let start = mainSegments[i];
              let end = mainSegments[i + 1];
              if (!end) continue;

              const rowExcludes = excludeSegments.slice().sort((a, b) => a - b);
              let currentStart = start;

              for (let j = 0; j < rowExcludes.length; j += 2) {
                const exStart = rowExcludes[j];
                const exEnd = rowExcludes[j + 1];
                if (!exEnd) continue;

                if (exStart > currentStart && exStart < end) {
                  cuts.push(parseFloat(((exStart - currentStart) / SCALE).toFixed(4)));
                  currentStart = exEnd;
                } else if (exStart <= currentStart && exEnd > currentStart) {
                  currentStart = Math.max(currentStart, exEnd);
                }
              }
              if (currentStart < end) {
                cuts.push(parseFloat(((end - currentStart) / SCALE).toFixed(4)));
              }
            }
          }
        }
        return cuts;
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
      };

      const getSticksPerEdge = (pts: Point[]) => {
        let sticks = 0;
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          const len = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) / SCALE;
          sticks += Math.ceil(len / 4);
        }
        return sticks;
      };

      const isPointOnSegment = (p: Point, a: Point, b: Point) => {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        if (d === 0) return Math.hypot(p.x - a.x, p.y - a.y) < 0.1;
        const dist = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x) / d;
        if (dist > 0.1) return false;
        const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
        return dot >= -0.1 && dot <= (d * d) + 0.1;
      };

      const shapeArea = getArea(shape.points);
      const shapePerim = getPerim(shape.points);

      let level1Area = 0;
      let level2Area = 0;
      let level3Area = 0;
      let dropArea = 0;
      let trapLisPerim = 0;

      // Helper for vertical segments (strips of width 20cm, length dropDepth)
      const addVerticalCuts = (perim: number, depth: number) => {
        if (depth <= 0 || perim <= 0) return;
        const numStrips = Math.ceil(perim / PANEL_WIDTH_METERS);
        for (let i = 0; i < numStrips; i++) {
          innerCuts.push(depth);
        }
      };

      if (shape.type === 'room') {
        if (shape.ceilingType === 'flat') {
          level1Area = shapeArea;
          outerCuts.push(...getRequiredCuts(shape.points));
        } else if (shape.ceilingType === 'drop1') {
          const inner = get().getOffsetPoints(shape.id, shape.edgeOffset);
          const innerArea = getArea(inner);
          level1Area = shapeArea - innerArea;
          level2Area = innerArea;
          dropArea = getPerim(inner) * shape.dropDepth;

          outerCuts.push(...getRequiredCuts(shape.points, [inner]));
          innerCuts.push(...getRequiredCuts(inner));

          const innerPerim = getPerim(inner);
          totalLisSikuValue += getSticksPerEdge(inner);
          addVerticalCuts(innerPerim, shape.dropDepth);
        } else if (shape.ceilingType === 'drop2') {
          const inner1 = get().getOffsetPoints(shape.id, shape.edgeOffset);
          const inner2 = get().getOffsetPoints(shape.id, shape.edgeOffset + shape.secondEdgeOffset);
          const area1 = getArea(inner1);
          const area2 = getArea(inner2);
          level1Area = shapeArea - area1;
          level2Area = area1 - area2;
          level3Area = area2;
          dropArea = (getPerim(inner1) + getPerim(inner2)) * shape.dropDepth;

          outerCuts.push(...getRequiredCuts(shape.points, [inner1]));
          innerCuts.push(...getRequiredCuts(inner1, [inner2]));
          innerCuts.push(...getRequiredCuts(inner2));

          const innerPerim1 = getPerim(inner1);
          const innerPerim2 = getPerim(inner2);
          totalLisSikuValue += getSticksPerEdge(inner1) + getSticksPerEdge(inner2);
          addVerticalCuts(innerPerim1, shape.dropDepth);
          addVerticalCuts(innerPerim2, shape.dropDepth);
        }
        totalLisDindingValue += getSticksPerEdge(shape.points);
      } else {
        // Trap (Manual) - Check for "connected" edges to walls
        level1Area = shapeArea;
        const rooms = shapes.filter(s => s.type === 'room' && s.isClosed);

        for (let i = 0; i < shape.points.length; i++) {
          const p1 = shape.points[i];
          const p2 = shape.points[(i + 1) % shape.points.length];
          const edgeLen = Math.hypot(p1.x - p2.x, p1.y - p2.y) / SCALE;

          let isSnappedToWall = false;
          for (const room of rooms) {
            for (let j = 0; j < room.points.length; j++) {
              const r1 = room.points[j];
              const r2 = room.points[(j + 1) % room.points.length];
              if (isPointOnSegment(p1, r1, r2) && isPointOnSegment(p2, r1, r2)) {
                isSnappedToWall = true;
                break;
              }
            }
            if (isSnappedToWall) break;
          }

          if (!isSnappedToWall) {
            dropArea += edgeLen * shape.dropDepth;
            totalLisSikuValue += Math.ceil(edgeLen / 4);
            addVerticalCuts(edgeLen, shape.dropDepth);
          }
        }
        innerCuts.push(...getRequiredCuts(shape.points));
      }

      const primary = level1Area + level3Area;
      const secondary = level2Area + dropArea;

      totalArea += shapeArea;
      totalPerimeter += shapePerim;
      totalVerticalArea += dropArea;
      totalPrimaryArea += primary;
      totalSecondaryArea += secondary;

      return {
        id: shape.id,
        type: shape.type,
        area: shapeArea,
        perimeter: shapePerim,
        primary,
        secondary
      };
    });

    const { boardPreference } = get();
    const allowed = boardPreference === '4m' ? [4] : boardPreference === '6m' ? [6] : [4, 6];

    const outerOpt = optimizeCuts(outerCuts, allowed);
    const innerOpt = optimizeCuts(innerCuts, allowed);

    if (boardPreference === 'both') {
      outerOpt.scenarioName = runScenarioComparison(outerCuts).scenarioName;
      innerOpt.scenarioName = runScenarioComparison(innerCuts).scenarioName;
    } else {
      outerOpt.scenarioName = `Manual (${boardPreference})`;
      innerOpt.scenarioName = `Manual (${boardPreference})`;
    }

    return {
      totalArea,
      totalPerimeter,
      totalVerticalArea,
      totalPrimaryArea,
      totalSecondaryArea,
      totalLisDinding: totalLisDindingValue,
      totalLisSiku: totalLisSikuValue,
      outerOptimization: outerOpt,
      innerOptimization: innerOpt,
      shapesBreakdown
    };
  },
}));
