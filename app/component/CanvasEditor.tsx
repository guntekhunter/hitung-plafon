'use client';
import React, { useMemo } from 'react';
import { Stage, Layer, Line, Circle, Text, Group, Rect } from 'react-konva';
import { usePlafonStore, SCALE, PANEL_WIDTH_METERS } from '@/app/function/usePlafonStore';

const CanvasEditor = () => {
    const {
        points, isClosed, addPoint, updatePoint, getOffsetPoints,
        ceilingType, edgeOffset, secondEdgeOffset,
        primaryColor, secondaryColor,
        primaryTexture, secondaryTexture,
        direction,
        updateEdgeLength // Add this
    } = usePlafonStore();

    // Interaction State
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [inputValue, setInputValue] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (editingIndex !== null && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingIndex]);

    const handleLabelClick = (index: number, currentLength: string) => {
        // Prevent editing while dragging points or not closed
        if (!isClosed) return;
        setEditingIndex(index);
        setInputValue(currentLength);
    };

    const handleInputCommit = () => {
        if (editingIndex !== null) {
            const val = parseFloat(inputValue);
            if (!isNaN(val) && val > 0) {
                updateEdgeLength(editingIndex, val);
            }
            setEditingIndex(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleInputCommit();
        if (e.key === 'Escape') setEditingIndex(null);
    };

    // const SCALE = 50; // Imported from store
    const SNAP_THRESHOLD = 20; // Pixels to snap

    // Helper hook to load image and dimensions
    const useTexture = (fileName: string | null) => {
        const [texture, setTexture] = React.useState<{ img: HTMLImageElement, width: number, height: number } | null>(null);
        React.useEffect(() => {
            if (!fileName) {
                setTexture(null);
                return;
            }
            const img = new window.Image();
            img.src = `/texture/${fileName}`;
            img.onload = () => setTexture({ img, width: img.naturalWidth, height: img.naturalHeight });
        }, [fileName]);
        return texture;
    };

    const primaryTexData = useTexture(primaryTexture);
    const secondaryTexData = useTexture(secondaryTexture);

    const panelHeightPx = PANEL_WIDTH_METERS * SCALE; // e.g., 0.2 * 50 = 10px tall

    // Calculate scale to make the texture height match the panel height (20cm / 10px)
    // Assuming image 'height' corresponds to the 20cm board width.
    const getScale = (tex: { width: number, height: number } | null) => {
        if (!tex) return { x: 1, y: 1 };
        // The Scale Factor = Target Size (10px) / Image Native Size
        // We assume the image represents a 20cm wide board.
        // If image is square or vertical, we map its height to the panel height.
        const s = panelHeightPx / tex.height;
        return { x: s, y: s }; // Maintain aspect ratio
    };

    const primaryScale = getScale(primaryTexData);
    const secondaryScale = getScale(secondaryTexData);

    // Flatten points for Konva Line [x1, y1, x2, y2...]
    const flattenedPoints = points.flatMap(p => [p.x, p.y]);



    // 1. Calculate Bounding Box (to know where to generate planks)
    const bounds = useMemo(() => {
        if (points.length < 2) return { minX: 0, minY: 0, width: 0, height: 0 };
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        return {
            minX, minY,
            width: Math.max(...xs) - minX,
            height: Math.max(...ys) - minY
        };
    }, [points]);

    // 2. Define the Clipping Function based on the drawn polygon
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clipFunc = React.useCallback((ctx: any) => {
        if (points.length < 3 || !isClosed) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
    }, [points, isClosed]);

    // 3. Generate the Planks (Ribbons) - TEXTURE ONLY
    const renderedPlanks = useMemo(() => {
        if (!isClosed || bounds.height === 0) return null;

        const planks = [];

        if (direction === 'horizontal') {
            const numRows = Math.ceil(bounds.height / panelHeightPx);
            for (let i = 0; i < numRows; i++) {
                const yPos = bounds.minY + (i * panelHeightPx);
                planks.push(
                    <Rect
                        key={`plank-h-${i}`}
                        x={bounds.minX - 10}
                        y={yPos}
                        width={bounds.width + 20}
                        height={panelHeightPx}
                        fill="transparent"
                        stroke="#cbd5e1"
                        strokeWidth={0.5}
                        opacity={0.3}
                    />
                );
            }
        } else {
            // Vertical - Columns
            const numCols = Math.ceil(bounds.width / panelHeightPx);
            for (let i = 0; i < numCols; i++) {
                const xPos = bounds.minX + (i * panelHeightPx);
                planks.push(
                    <Rect
                        key={`plank-v-${i}`}
                        x={xPos}
                        y={bounds.minY - 10}
                        width={panelHeightPx}
                        height={bounds.height + 20}
                        fill="transparent"
                        stroke="#cbd5e1"
                        strokeWidth={0.5}
                        opacity={0.3}
                    />
                );
            }
        }
        return planks;
    }, [isClosed, bounds, panelHeightPx, direction]);

    // Inner points calculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let innerPoints1: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let innerPoints2: any[] = [];

    if (isClosed) {
        if (ceilingType === 'drop1' || ceilingType === 'drop2') {
            innerPoints1 = getOffsetPoints(edgeOffset);
        }
        if (ceilingType === 'drop2') {
            innerPoints2 = getOffsetPoints(edgeOffset + secondEdgeOffset);
        }
    }

    const flattenedInnerPoints1 = innerPoints1.flatMap(p => [p.x, p.y]);
    const flattenedInnerPoints2 = innerPoints2.flatMap(p => [p.x, p.y]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleStageClick = (e: any) => {
        // Only add points if clicking on empty space and shape not closed
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (pos && !isClosed) {
            addPoint(pos.x, pos.y);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragMove = (e: any, index: number) => {
        let newX = e.target.x();
        let newY = e.target.y();

        // Snapping Logic
        const neighbors = [];
        // Previous point
        if (index > 0) neighbors.push(points[index - 1]);
        else if (isClosed) neighbors.push(points[points.length - 1]);

        // Next point
        if (index < points.length - 1) neighbors.push(points[index + 1]);
        else if (isClosed) neighbors.push(points[0]);

        neighbors.forEach(neighbor => {
            if (Math.abs(newX - neighbor.x) < SNAP_THRESHOLD) newX = neighbor.x;
            if (Math.abs(newY - neighbor.y) < SNAP_THRESHOLD) newY = neighbor.y;
        });

        // Update position immediately for smooth feedback
        e.target.x(newX);
        e.target.y(newY);

        updatePoint(index, newX, newY);
    };

    return (
        <div className="relative border-2 border-slate-200 rounded-lg overflow-hidden bg-white shadow-inner">
            <Stage
                width={800}
                height={600}
                onMouseDown={handleStageClick}
                className="cursor-crosshair bg-grid-pattern" // Custom class for grid bg
            >
                <Layer>
                    {!isClosed && (
                        <Text text="Click to place corners. Click start point to close." x={20} y={20} fill="gray" />
                    )}

                    {/* VISUALIZATION - STACKED LAYERS */}
                    {isClosed && (
                        <Group>
                            {/* Layer 1: Base / Outer - Primary */}
                            <Line
                                points={flattenedPoints}
                                fill={!(primaryTexData?.img) ? primaryColor : undefined}
                                fillPatternImage={primaryTexData?.img || undefined}
                                fillPatternRepeat="repeat"
                                fillPatternScale={primaryScale}
                                fillPatternRotation={direction === 'horizontal' ? 90 : 0}
                                fillPatternY={bounds.minY}
                                closed={true}
                                strokeEnabled={false}
                            />

                            {/* Layer 2: Drop 1 - Secondary */}
                            {flattenedInnerPoints1.length > 0 && (
                                <Line
                                    points={flattenedInnerPoints1}
                                    fill={!(secondaryTexData?.img) ? secondaryColor : undefined}
                                    fillPatternImage={secondaryTexData?.img || undefined}
                                    fillPatternRepeat="repeat"
                                    fillPatternScale={secondaryScale}
                                    fillPatternRotation={direction === 'horizontal' ? 90 : 0}
                                    fillPatternY={bounds.minY}
                                    closed={true}
                                    strokeEnabled={false}
                                />
                            )}

                            {/* Layer 3: Drop 2 - Primary */}
                            {flattenedInnerPoints2.length > 0 && (
                                <Line
                                    points={flattenedInnerPoints2}
                                    fill={!(primaryTexData?.img) ? primaryColor : undefined}
                                    fillPatternImage={primaryTexData?.img || undefined}
                                    fillPatternRepeat="repeat"
                                    fillPatternScale={primaryScale}
                                    fillPatternRotation={direction === 'horizontal' ? 90 : 0}
                                    fillPatternY={bounds.minY}
                                    closed={true}
                                    strokeEnabled={false}
                                />
                            )}
                        </Group>
                    )}

                    {/* PANEL TEXTURE OVERLAY (Clipped to Main Shape) */}
                    {isClosed && (
                        <Group clipFunc={clipFunc}>
                            {renderedPlanks}
                        </Group>
                    )}

                    {/* OUTLINES / STROKES (Drawn on top for crispness) */}
                    <Line
                        points={flattenedPoints}
                        stroke="#0ea5e9" // Sky blue
                        strokeWidth={isClosed ? 3 : 2}
                        closed={isClosed}
                        lineCap="round"
                        lineJoin="round"
                    />

                    {/* Drop 1 Outline (Amber) */}
                    {isClosed && flattenedInnerPoints1.length > 0 && (
                        <Line
                            points={flattenedInnerPoints1}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dash={[10, 5]}
                            closed={true}
                        />
                    )}

                    {/* Drop 2 Outline (Orange) */}
                    {isClosed && flattenedInnerPoints2.length > 0 && (
                        <Line
                            points={flattenedInnerPoints2}
                            stroke="#ea580c"
                            strokeWidth={2}
                            dash={[5, 5]}
                            closed={true}
                        />
                    )}

                    {/* Length Labels */}
                    {points.map((point, i) => {
                        if (i === points.length - 1 && !isClosed) return null;

                        const nextPoint = points[(i + 1) % points.length];
                        const midX = (point.x + nextPoint.x) / 2;
                        const midY = (point.y + nextPoint.y) / 2;
                        const lengthPx = Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
                        const lengthM = (lengthPx / SCALE).toFixed(2);

                        // If editing this index, don't show text, show input overlay (but input is DOM, so maybe show faint text or nothing)
                        const isEditing = editingIndex === i;

                        return (
                            <React.Fragment key={`label-${i}`}>
                                {!isEditing && (
                                    <Group
                                        onClick={() => handleLabelClick(i, lengthM)}
                                        onTap={() => handleLabelClick(i, lengthM)}
                                        onMouseEnter={() => {
                                            const container = document.body;
                                            if (container) container.style.cursor = "text";
                                        }}
                                        onMouseLeave={() => {
                                            const container = document.body;
                                            if (container) container.style.cursor = "default";
                                        }}
                                    >
                                        {/* Background for easier clicking */}
                                        <Rect
                                            x={midX - 25}
                                            y={midY - 12}
                                            width={50}
                                            height={24}
                                            fill="rgba(255, 255, 255, 0.8)"
                                            cornerRadius={4}
                                            stroke={isClosed ? "#cbd5e1" : "transparent"} // Show hint it's interactive
                                            strokeWidth={1}
                                        />
                                        <Text
                                            x={midX}
                                            y={midY}
                                            text={`${lengthM}m`}
                                            fontSize={12}
                                            fill="#0f172a"
                                            align="center"
                                            verticalAlign="middle"
                                            offsetX={20}
                                            offsetY={6}
                                            fontStyle="bold"
                                        />
                                    </Group>
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* Drag Handles (Corners) */}
                    {points.map((point, i) => (
                        <Circle
                            key={i}
                            x={point.x}
                            y={point.y}
                            radius={6}
                            fill="white"
                            stroke="#0284c7"
                            strokeWidth={2}
                            draggable
                            onDragMove={(e) => handleDragMove(e, i)}
                            onMouseEnter={e => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = "move";
                            }}
                            onMouseLeave={e => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = "default";
                            }}
                        />
                    ))}
                </Layer>
            </Stage>

            {/* DOM Overlay for Input */}
            {editingIndex !== null && points.length > editingIndex && (
                (() => {
                    const p1 = points[editingIndex];
                    const p2 = points[(editingIndex + 1) % points.length];
                    const midX = (p1.x + p2.x) / 2;
                    const midY = (p1.y + p2.y) / 2;

                    return (
                        <input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onBlur={handleInputCommit}
                            onKeyDown={handleKeyDown}
                            className="absolute z-10 w-20 px-1 py-0.5 text-sm font-bold text-center border border-sky-500 rounded shadow-md outline-none"
                            style={{
                                left: midX - 40 + 'px', // half width offset
                                top: midY - 12 + 'px',  // half height offset
                            }}
                        />
                    );
                })()
            )}
        </div>
    );
};

export default CanvasEditor;