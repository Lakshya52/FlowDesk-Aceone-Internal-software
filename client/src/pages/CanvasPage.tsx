/**
 * CanvasPage Component
 *
 * A full-page individual workspace canvas. It provides an infinite plane where a single
 * user can pan, zoom, add, write, drag, and resize sticky notes. Includes server sync
 * interactions for CRUD operations on personal notes.
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Plus, Minus, Maximize, Shrink, Focus, MousePointer2, Hand,
    Trash2, Move, Loader2
} from "lucide-react";
import api from "../lib/api";

interface Note {
    _id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    content: string;
    color: string;
}

const COLORS = ["#fef9c3", "#dcfce7", "#dbeafe", "#f3e8ff", "#fee2e2"];

const CanvasPage: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Canvas Transformation State
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    
    // Interaction Flags
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingNode, setIsDraggingNode] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    // Active Element References
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [resizingNoteId, setResizingNoteId] = useState<string | null>(null);
    const [activeEditId, setActiveEditId] = useState<string | null>(null);
    const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [selectedTool, setSelectedTool] = useState<'select' | 'pan'>('select');

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const notesRef = useRef<Note[]>(notes);

    useEffect(() => {
        notesRef.current = notes;
    }, [notes]);

    // Fetch notes on mount
    useEffect(() => {
        fetchNotes();
    }, []);

    /**
     * Initializes the canvas with the current user's saved notes
     * fetched from the backend API.
     */
    const fetchNotes = async () => {
        try {
            const { data } = await api.get("/canvas");
            setNotes(data);
        } catch (error) {
            console.error("Failed to fetch notes", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to zoom towards a specific point
    /**
     * Calculates and updates the transformation matrix to seamlessly zoom in/out
     * towards a specific coordinate point on the screen (usually the mouse cursor center point).
     */
    const zoomTowards = (newScale: number, centerX: number, centerY: number) => {
        setScale(prevScale => {
            const s1 = prevScale;
            const s2 = newScale;

            setOffset(prevOffset => ({
                x: centerX - (centerX - prevOffset.x) * (s2 / s1),
                y: centerY - (centerY - prevOffset.y) * (s2 / s1)
            }));

            return s2;
        });
    };

    // Zoom handler
    const handleWheel = (e: React.WheelEvent) => {
        if (e.altKey) {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const delta = -e.deltaY * 0.001;
            const newScale = Math.min(Math.max(0.1, scale + delta), 5);

            zoomTowards(newScale, mouseX, mouseY);
        } else {
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    /**
     * Initializes interactions based on current tool mode or hotkey modifiers.
     * Determines whether to start panning the canvas or tracking for other behaviors.
     */
    const handleMouseDown = (e: React.MouseEvent) => {
        const isMiddleButton = e.button === 1;
        const isAltPressed = e.altKey;

        // Rule 1 & 3: Pan tool or Alt/Middle mouse button starts panning
        if (selectedTool === 'pan' || isMiddleButton || (selectedTool === 'select' && isAltPressed)) {
            setIsPanning(true);
            setMousePos({ x: e.clientX, y: e.clientY });
            return;
        }

        setMousePos({ x: e.clientX, y: e.clientY });
        setStartMousePos({ x: e.clientX, y: e.clientY });
    };

    /**
     * Handles fluid interactions like canvas panning, note dragging, and note resizing
     * by comparing the current cursor offset against the initial mousedown position
     * scaled by the current zoom level.
     */
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - mousePos.x;
            const dy = e.clientY - mousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setMousePos({ x: e.clientX, y: e.clientY });
        } else if (draggedNoteId) {
            // Threshold check: prevent accidental movement on simple clicks
            if (!isDraggingNode) {
                const moveDist = Math.sqrt(Math.pow(e.clientX - startMousePos.x, 2) + Math.pow(e.clientY - startMousePos.y, 2));
                if (moveDist > 3) {
                    setIsDraggingNode(true);
                }
                return;
            }

            const dx = (e.clientX - mousePos.x) / scale;
            const dy = (e.clientY - mousePos.y) / scale;
            setNotes(prev => prev.map(n => n._id === draggedNoteId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
            setMousePos({ x: e.clientX, y: e.clientY });
        } else if (isResizing && resizingNoteId) {
            const dx = (e.clientX - mousePos.x) / scale;
            const dy = (e.clientY - mousePos.y) / scale;
            setNotes(prev => prev.map(n => n._id === resizingNoteId ? {
                ...n,
                width: Math.max(150, (n.width || 200) + dx),
                height: Math.max(100, (n.height || 140) + dy)
            } : n));
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;

            if (e.key === 'v' || e.key === 'V') setSelectedTool('select');
            if (e.key === 'h' || e.key === 'H') setSelectedTool('pan');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    /**
     * Completes dragging or resizing interactions and saves updated note properties
     * (position or dimensions) asynchronously to the backend database.
     */
    const handleMouseUp = useCallback(async () => {
        const wasInteracting = isDraggingNode || isResizing;
        const targetId = draggedNoteId || resizingNoteId;

        // Immediately disable flags to kill the "buttery" effect and snap state
        setIsDraggingNode(false);
        setIsPanning(false);
        setIsResizing(false);
        setDraggedNoteId(null);
        setResizingNoteId(null);

        if (wasInteracting && targetId) {
            const note = notesRef.current.find(n => n._id === targetId);
            if (note) {
                try {
                    await api.put(`/canvas/${targetId}`, {
                        x: note.x,
                        y: note.y,
                        width: note.width || 200,
                        height: note.height || 140,
                        content: note.content,
                        color: note.color
                    });
                } catch (error) {
                    console.error("Failed to save note properties", error);
                }
            }
        }
    }, [isDraggingNode, isResizing, draggedNoteId, resizingNoteId]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    const addNoteAt = async (x: number, y: number) => {
        const newNoteData = {
            x: x - 100,
            y: y - 60,
            width: 200,
            height: 140,
            content: "New Note",
            color: COLORS[Math.floor(Math.random() * COLORS.length)]
        };

        try {
            const { data } = await api.post("/canvas", newNoteData);
            setNotes([...notes, data]);
        } catch (error) {
            console.error("Failed to create note", error);
        }
    };

    const addNote = async () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = (rect.width / 2 - offset.x) / scale;
        const centerY = (rect.height / 2 - offset.y) / scale;

        await addNoteAt(centerX, centerY);
    };

    const deleteNote = async (id: string) => {
        try {
            await api.delete(`/canvas/${id}`);
            setNotes(notes.filter(n => n._id !== id));
        } catch (error) {
            console.error("Failed to delete note", error);
        }
    };

    const updateNoteContent = async (id: string, content: string) => {
        setNotes(notes.map(n => n._id === id ? { ...n, content } : n));
    };

    const saveContent = async (id: string, content: string) => {
        try {
            await api.put(`/canvas/${id}`, { content });
        } catch (error) {
            console.error("Failed to save note content", error);
        }
    };

    const resetView = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: isFullScreen ? "fixed" : "absolute",
                inset: 0,
                zIndex: isFullScreen ? 9999 : 1,
                overflow: "hidden",
                background: "var(--color-bg)",
                cursor: isPanning ? "grabbing" : (selectedTool === 'pan' ? 'grab' : "auto"),
                userSelect: "none"
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Grid Pattern */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `
                        radial-gradient(circle at 1px 1px, var(--color-text-tertiary) 1px, transparent 0),
                        linear-gradient(to right, var(--color-border) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)
                    `,
                    backgroundSize: `
                        ${20 * scale}px ${20 * scale}px,
                        ${100 * scale}px ${100 * scale}px,
                        ${100 * scale}px ${100 * scale}px
                    `,
                    backgroundPosition: `
                        ${offset.x}px ${offset.y}px,
                        ${offset.x}px ${offset.y}px,
                        ${offset.x}px ${offset.y}px
                    `,
                    pointerEvents: "none",
                    opacity: 0.3
                }}
            />

            {/* Transform Container */}
            <div
                ref={canvasRef}
                style={{
                    position: "absolute",
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: "0 0",
                    transition: isPanning ? "none" : "transform 0.05s linear"
                }}
            >
                {notes.map(note => (
                    <div
                        key={note._id}
                        style={{
                            position: "absolute",
                            left: note.x,
                            top: note.y,
                            width: note.width || 200,
                            height: note.height || "auto",
                            minHeight: 140,
                            background: note.color,
                            padding: 16,
                            borderRadius: 12,
                            boxShadow: "var(--shadow-md)",
                            border: "1px solid rgba(0,0,0,0.05)",
                            cursor: "default",
                            zIndex: activeEditId === note._id ? 1000 : 1,
                            color: "#1e293b",
                            display: "flex",
                            flexDirection: "column"
                        }}
                        onMouseDown={(e) => {
                            // Always stop propagation in Select mode to prevent canvas-level actions
                            if (selectedTool === 'select') {
                                e.stopPropagation();
                            }

                            if (activeEditId === note._id) return;

                            // Rule 1: Pan tool drags the board, not the note
                            if (selectedTool === 'pan') return;

                            // Rule 3: Select tool allows dragging
                            if (selectedTool === 'select') {
                                setDraggedNoteId(note._id);
                                setMousePos({ x: e.clientX, y: e.clientY });
                                setStartMousePos({ x: e.clientX, y: e.clientY });
                            }
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: 0.4 }}>
                            <Move size={14} style={{ cursor: "grab" }} />
                            <Trash2
                                size={14}
                                style={{ cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); deleteNote(note._id); }}
                            />
                        </div>

                        {activeEditId === note._id ? (
                            <textarea
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                value={note.content}
                                onChange={(e) => updateNoteContent(note._id, e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()} // Prevent creating new note underneath
                                onBlur={() => {
                                    saveContent(note._id, note.content);
                                    setActiveEditId(null);
                                }}
                                style={{
                                    width: "100%",
                                    flex: 1,
                                    background: "transparent",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    fontSize: "0.9rem",
                                    fontFamily: "inherit"
                                }}
                            />
                        ) : (
                            <div
                                onDoubleClick={() => setActiveEditId(note._id)}
                                style={{
                                    flex: 1,
                                    fontSize: "0.9rem",
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    overflow: "hidden"
                                }}
                            >
                                {note.content}
                            </div>
                        )}
                        <div style={{ fontSize: '0.7rem', opacity: 0.3, textAlign: 'right', marginTop: 8 }}>
                            Double click to edit
                        </div>

                        {/* Resize Handle */}
                        <div
                            onMouseDown={(e) => {
                                // Rule 3: Only Select tool can resize
                                if (selectedTool !== 'select') return;

                                e.stopPropagation();
                                setIsResizing(true);
                                setResizingNoteId(note._id);
                                setMousePos({ x: e.clientX, y: e.clientY });
                            }}
                            style={{
                                position: "absolute",
                                bottom: 0,
                                right: 0,
                                width: 20,
                                height: 20,
                                cursor: "nwse-resize",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0.3
                            }}
                        >
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 0L0 10M10 5L5 10M10 8L8 10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>

            {loading && (
                <div style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(2px)",
                    zIndex: 2000
                }}>
                    <Loader2 className="animate-spin" size={32} color="var(--color-primary)" />
                </div>
            )}

            {/* Controls */}
            <div
                style={{
                    position: "absolute",
                    bottom: 24,
                    right: 24,
                    background: "var(--color-surface)",
                    padding: "8px 12px",
                    borderRadius: 12,
                    display: "flex",
                    gap: 12,
                    boxShadow: "var(--shadow-lg)",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)"
                }}
            >
                <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) zoomTowards(Math.min(scale + 0.2, 5), rect.width / 2, rect.height / 2);
                    }}
                >
                    <Plus size={16} />
                </button>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, width: 40, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
                <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) zoomTowards(Math.max(scale - 0.2, 0.1), rect.width / 2, rect.height / 2);
                    }}
                >
                    <Minus size={16} />
                </button>
                <div style={{ width: 1, height: 20, background: "var(--color-border)" }} />
                <button className="btn btn-secondary btn-xs" onClick={resetView} title="Reset View"><Maximize size={16} /></button>
                <button
                    className={`btn ${scale === 1 ? 'btn-primary' : 'btn-secondary'} btn-xs`}
                    onClick={() => {
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) zoomTowards(1, rect.width / 2, rect.height / 2);
                    }}
                    title="Center View"
                >
                    <Focus size={16} />
                </button>
                <button
                    className={`btn ${isFullScreen ? 'btn-primary' : 'btn-secondary'} btn-xs`}
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Shrink size={16} /> : <Maximize size={16} />}
                </button>
            </div>

            {/* Top Tools */}
            <div
                style={{
                    position: "absolute",
                    top: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--color-surface)",
                    padding: "6px",
                    borderRadius: 50,
                    display: "flex",
                    gap: 6,
                    boxShadow: "var(--shadow-lg)",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    zIndex: 1000
                }}
            >
                <div style={{ display: 'flex', background: 'var(--color-bg-secondary)', borderRadius: 40, padding: 4, gap: 4 }}>
                    <button
                        onClick={() => setSelectedTool('select')}
                        className={`btn btn-xs ${selectedTool === 'select' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ borderRadius: 20, width: 36, height: 36, padding: 0 }}
                        title="Select Tool (V)"
                    >
                        <MousePointer2 size={16} />
                    </button>
                    <button
                        onClick={() => setSelectedTool('pan')}
                        className={`btn btn-xs ${selectedTool === 'pan' ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ borderRadius: 20, width: 36, height: 36, padding: 0 }}
                        title="Pan Tool (H)"
                    >
                        <Hand size={16} />
                    </button>
                </div>

                <div style={{ width: 1, height: 24, background: 'var(--color-border)', margin: '0 4px' }} />

                <button
                    onClick={addNote}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{
                        borderRadius: 20,
                        padding: "6px 16px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: 36,
                        opacity: loading ? 0.7 : 1,
                        margin: "4px",
                    }}
                >
                    <Plus size={16} /> Add Note
                </button>
            </div>
        </div>
    );
};

export default CanvasPage;
