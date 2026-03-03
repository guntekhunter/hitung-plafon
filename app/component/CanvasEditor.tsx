'use client';
import React, { useMemo } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva';
import Konva from 'konva';
import { usePlafonStore, SCALE, PANEL_WIDTH_METERS } from '@/app/function/usePlafonStore';

const CanvasEditor = () => {
    const {
        shapes, activeShapeId, addPoint, updatePoint, updateEdgeLength, getOffsetPoints, setActiveShape
    } = usePlafonStore();

    // Interaction & View Settings
    const [stageScale, setStageScale] = React.useState(1);
    const [stagePos, setStagePos] = React.useState({ x: 0, y: 0 });
    const [editingIndex, setEditingIndex] = React.useState<{ shapeId: string, index: number } | null>(null);
    const [inputValue, setInputValue] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (editingIndex !== null && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingIndex]);

    const SNAP_THRESHOLD = 15;

    // Helper: Convert screen/stage click to world coordinates
    const getPointerPosition = (stage: any) => {
        const pos = stage.getPointerPosition();
        if (!pos) return null;
        return {
            x: (pos.x - stage.x()) / stage.scaleX(),
            y: (pos.y - stage.y()) / stage.scaleY()
        };
    };

    // Helper: Snap to edges of OTHER shapes
    const getSnappedToEdge = (x: number, y: number, currentShapeId: string) => {
        let snapped = { x, y };
        let minDistance = Infinity;

        shapes.forEach(shape => {
            if (shape.id === currentShapeId) return; // Don't snap to itself yet (internal snapping handled elsewhere)
            if (shape.points.length < 2) return;

            for (let i = 0; i < shape.points.length; i++) {
                const p1 = shape.points[i];
                const p2 = shape.points[(i + 1) % shape.points.length];
                if (i === shape.points.length - 1 && !shape.isClosed) continue;

                // Nearest point on segment logic
                const atob = { x: p2.x - p1.x, y: p2.y - p1.y };
                const atop = { x: x - p1.x, y: y - p1.y };
                const lenSq = atob.x * atob.x + atob.y * atob.y;
                let dot = lenSq === 0 ? 0 : (atop.x * atob.x + atop.y * atob.y) / lenSq;
                dot = Math.max(0, Math.min(1, dot));
                const nearest = { x: p1.x + atob.x * dot, y: p1.y + atob.y * dot };

                const dist = Math.hypot(x - nearest.x, y - nearest.y);
                if (dist < SNAP_THRESHOLD && dist < minDistance) {
                    minDistance = dist;
                    snapped = nearest;
                }
            }
        });
        return snapped;
    };

    const handleLabelClick = (shapeId: string, index: number, currentLength: string) => {
        const shape = shapes.find(s => s.id === shapeId);
        if (!shape || !shape.isClosed) return;
        setEditingIndex({ shapeId, index });
        setInputValue(currentLength);
        setActiveShape(shapeId);
    };

    const handleInputCommit = () => {
        if (editingIndex !== null) {
            const val = parseFloat(inputValue);
            if (!isNaN(val) && val > 0) {
                updateEdgeLength(editingIndex.shapeId, editingIndex.index, val);
            }
            setEditingIndex(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleInputCommit();
        if (e.key === 'Escape') setEditingIndex(null);
    };

    const handleZoom = (e: any) => {
        e.evt.preventDefault();
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
        const clampedScale = Math.max(0.2, Math.min(5, newScale));

        setStageScale(clampedScale);
        setStagePos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    };

    // texture handling (keeping existing logic)
    const useTexture = (fileName: string | null) => {
        const [texture, setTexture] = React.useState<{ img: HTMLImageElement, width: number, height: number } | null>(null);
        React.useEffect(() => {
            if (!fileName) { setTexture(null); return; }
            const img = new window.Image();
            img.src = `/texture/${fileName}`;
            img.onload = () => setTexture({ img, width: img.naturalWidth, height: img.naturalHeight });
        }, [fileName]);
        return texture;
    };

    const firstRoom = shapes.find(s => s.type === 'room') || shapes[0];
    const primaryTexData = useTexture(firstRoom?.primaryTexture);
    const secondaryTexData = useTexture(firstRoom?.secondaryTexture);
    const panelHeightPx = PANEL_WIDTH_METERS * SCALE;
    const getTexScale = (tex: any) => tex ? (panelHeightPx / tex.height) : 1;

    const handleStageMouseDown = (e: any) => {
        if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.shiftKey)) return; // Don't add point when panning

        const stage = e.target.getStage();
        const pos = getPointerPosition(stage);
        if (pos) {
            // Apply edge snapping to new point
            const snapped = getSnappedToEdge(pos.x, pos.y, activeShapeId || "");
            addPoint(snapped.x, snapped.y);
        }
    };

    const handleDragMove = (e: any, shapeId: string, index: number) => {
        let newX = e.target.x();
        let newY = e.target.y();

        const shape = shapes.find(s => s.id === shapeId);
        if (!shape) return;

        // 1. Internal Point Snapping
        const neighbors = [];
        if (index > 0) neighbors.push(shape.points[index - 1]);
        else if (shape.isClosed) neighbors.push(shape.points[shape.points.length - 1]);
        if (index < shape.points.length - 1) neighbors.push(shape.points[index + 1]);
        else if (shape.isClosed) neighbors.push(shape.points[0]);

        neighbors.forEach(neighbor => {
            if (Math.abs(newX - neighbor.x) < 10) newX = neighbor.x;
            if (Math.abs(newY - neighbor.y) < 10) newY = neighbor.y;
        });

        // 2. Edge Snapping (to other shapes)
        const snapped = getSnappedToEdge(newX, newY, shapeId);
        newX = snapped.x;
        newY = snapped.y;

        e.target.x(newX);
        e.target.y(newY);
        updatePoint(shapeId, index, newX, newY);
    };

    // Helper: Render Panel Direction Lines (Decorative)
    const renderPanelLines = (pts: any[], direction: 'horizontal' | 'vertical', isActive: boolean) => {
        if (pts.length < 3) return null;
        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const step = PANEL_WIDTH_METERS * SCALE;
        const lines = [];

        if (direction === 'horizontal') {
            for (let y = minY + step; y < maxY; y += step) {
                lines.push(<Line key={`h-${y}`} points={[minX, y, maxX, y]} stroke="#cbd5e1" strokeWidth={0.5 / stageScale} dash={[5, 5]} />);
            }
        } else {
            for (let x = minX + step; x < maxX; x += step) {
                lines.push(<Line key={`v-${x}`} points={[x, minY, x, maxY]} stroke="#cbd5e1" strokeWidth={0.5 / stageScale} dash={[5, 5]} />);
            }
        }

        return (
            <Group clipFunc={(ctx) => {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
                pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
                ctx.closePath();
            }}>
                {lines}
            </Group>
        );
    };

    return (
        <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-slate-100 shadow-inner group">
            {/* Legend / Tooltip */}
            <div className="absolute top-4 left-4 z-10 space-y-2 pointer-events-none">
                <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm flex items-center gap-3">
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">Scroll</kbd> Zoom</span>
                    <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 border rounded text-[10px]">Right Click</kbd> Pan</span>
                </div>
            </div>

            <Stage
                width={800}
                height={600}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                onWheel={handleZoom}
                onMouseDown={handleStageMouseDown}
                draggable={true}
                onDragEnd={(e: any) => {
                    if (e.target === e.target.getStage()) {
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                    }
                }}
                // Custom pan with middle mouse or right click
                onContentContextMenu={(e: any) => e.evt.preventDefault()}
                className="bg-grid-pattern cursor-move"
            >
                <Layer>
                    {shapes.length === 0 && (
                        <Text text="Klik untuk mulai menggambar sudut..." x={20} y={20} fill="#94a3b8" fontSize={14} />
                    )}

                    {shapes.map(shape => {
                        const flattenedPoints = shape.points.flatMap(p => [p.x, p.y]);
                        const isActive = shape.id === activeShapeId;
                        const pScale = getTexScale(primaryTexData);
                        const sScale = getTexScale(secondaryTexData);

                        let offset1: any[] = [];
                        let offset2: any[] = [];
                        if (shape.isClosed && shape.type === 'room') {
                            if (shape.ceilingType !== 'flat') offset1 = getOffsetPoints(shape.id, shape.edgeOffset);
                            if (shape.ceilingType === 'drop2') offset2 = getOffsetPoints(shape.id, shape.edgeOffset + shape.secondEdgeOffset);
                        }

                        const minY = Math.min(...shape.points.map(p => p.y));

                        return (
                            <Group key={shape.id} onClick={() => setActiveShape(shape.id)}>
                                {shape.isClosed && (
                                    <Group>
                                        <Line
                                            points={flattenedPoints}
                                            fill={!(primaryTexData?.img) ? shape.primaryColor : undefined}
                                            fillPatternImage={primaryTexData?.img || undefined}
                                            fillPatternScale={{ x: pScale, y: pScale }}
                                            fillPatternRotation={shape.direction === 'horizontal' ? 90 : 0}
                                            fillPatternY={minY}
                                            closed={true}
                                            opacity={isActive ? 1 : 0.6}
                                        />
                                        {/* Visualization of Panel Direction */}
                                        {renderPanelLines(shape.points, shape.direction, isActive)}

                                        {offset1.length > 0 && (
                                            <>
                                                <Line
                                                    points={offset1.flatMap(p => [p.x, p.y])}
                                                    fill={!(secondaryTexData?.img) ? shape.secondaryColor : undefined}
                                                    fillPatternImage={secondaryTexData?.img || undefined}
                                                    fillPatternScale={{ x: sScale, y: sScale }}
                                                    fillPatternRotation={shape.direction === 'horizontal' ? 90 : 0}
                                                    fillPatternY={minY}
                                                    closed={true}
                                                />
                                                {renderPanelLines(offset1, shape.direction, isActive)}
                                            </>
                                        )}
                                        {offset2.length > 0 && (
                                            <>
                                                <Line
                                                    points={offset2.flatMap(p => [p.x, p.y])}
                                                    fill={!(primaryTexData?.img) ? shape.primaryColor : undefined}
                                                    fillPatternImage={primaryTexData?.img || undefined}
                                                    fillPatternScale={{ x: pScale, y: pScale }}
                                                    fillPatternRotation={shape.direction === 'horizontal' ? 90 : 0}
                                                    fillPatternY={minY}
                                                    closed={true}
                                                />
                                                {renderPanelLines(offset2, shape.direction, isActive)}
                                            </>
                                        )}
                                    </Group>
                                )}

                                <Line
                                    points={flattenedPoints}
                                    stroke={isActive ? "#0ea5e9" : "#94a3b8"}
                                    strokeWidth={isActive ? 3 / stageScale : 2 / stageScale}
                                    closed={shape.isClosed}
                                />

                                {/* Labels */}
                                {shape.points.map((point, i) => {
                                    if (i === shape.points.length - 1 && !shape.isClosed) return null;
                                    const nextPoint = shape.points[(i + 1) % shape.points.length];
                                    const midX = (point.x + nextPoint.x) / 2;
                                    const midY = (point.y + nextPoint.y) / 2;
                                    const lengthM = (Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y) / SCALE).toFixed(2);
                                    if (parseFloat(lengthM) < 0.1) return null;

                                    return (
                                        <Group key={`lbl-${shape.id}-${i}`} onClick={() => handleLabelClick(shape.id, i, lengthM)}>
                                            <Rect x={midX - 18 / stageScale} y={midY - 8 / stageScale} width={36 / stageScale} height={16 / stageScale} fill="white" stroke="#e2e8f0" strokeWidth={1 / stageScale} cornerRadius={2 / stageScale} />
                                            <Text x={midX - 18 / stageScale} y={midY - 4 / stageScale} width={36 / stageScale} text={lengthM} fontSize={9 / stageScale} align="center" fontStyle="bold" fill="#64748b" />
                                        </Group>
                                    );
                                })}

                                {/* Points */}
                                {shape.points.map((p, i) => (
                                    <Circle
                                        key={`pt-${shape.id}-${i}`}
                                        x={p.x} y={p.y}
                                        radius={(isActive ? 5 : 3) / stageScale}
                                        fill="white" stroke={isActive ? "#0ea5e9" : "#cbd5e1"} strokeWidth={1 / stageScale}
                                        draggable={isActive}
                                        onDragMove={(e) => handleDragMove(e, shape.id, i)}
                                    />
                                ))}
                            </Group>
                        );
                    })}
                </Layer>
            </Stage>

            {/* DOM Overlay Input - Position must be manually calculated based on Stage Transformation */}
            {editingIndex !== null && (() => {
                const shape = shapes.find(s => s.id === editingIndex.shapeId);
                if (!shape) return null;
                const p1 = shape.points[editingIndex.index];
                const p2 = shape.points[(editingIndex.index + 1) % shape.points.length];
                const worldMidX = (p1.x + p2.x) / 2;
                const worldMidY = (p1.y + p2.y) / 2;

                // Screen coordinates
                const screenX = worldMidX * stageScale + stagePos.x;
                const screenY = worldMidY * stageScale + stagePos.y;

                return (
                    <input
                        ref={inputRef}
                        type="number" step="0.01" value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onBlur={handleInputCommit}
                        onKeyDown={handleKeyDown}
                        className="absolute z-10 w-16 px-1 py-0.5 text-xs font-bold text-center border-2 border-sky-500 rounded bg-white shadow-xl outline-none"
                        style={{ left: screenX - 32 + 'px', top: screenY - 12 + 'px' }}
                    />
                );
            })()}
        </div>
    );
};

export default CanvasEditor;