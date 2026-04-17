import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    Plus, Minus, Maximize,
    // MousePointer2,
    StickyNote, Trash2,
    //  Edit3,
    Move, Loader2
} from "lucide-react";
import api from "../lib/api";

interface Note {
    _id: string;
    x: number;
    y: number;
    content: string;
    color: string;
}

const COLORS = ["#fef9c3", "#dcfce7", "#dbeafe", "#f3e8ff", "#fee2e2"];

const CanvasPage: React.FC = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingNode, setIsDraggingNode] = useState(false);
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [activeEditId, setActiveEditId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Fetch notes on mount
    useEffect(() => {
        fetchNotes();
    }, []);

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

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
        }
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - mousePos.x;
            const dy = e.clientY - mousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setMousePos({ x: e.clientX, y: e.clientY });
        } else if (isDraggingNode && draggedNoteId) {
            const dx = (e.clientX - mousePos.x) / scale;
            const dy = (e.clientY - mousePos.y) / scale;
            setNotes(prev => prev.map(n => n._id === draggedNoteId ? { ...n, x: n.x + dx, y: n.y + dy } : n));
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = useCallback(async () => {
        if (isDraggingNode && draggedNoteId) {
            const note = notes.find(n => n._id === draggedNoteId);
            if (note) {
                try {
                    await api.put(`/canvas/${draggedNoteId}`, {
                        x: note.x,
                        y: note.y
                    });
                } catch (error) {
                    console.error("Failed to save note position", error);
                }
            }
        }
        setIsPanning(false);
        setIsDraggingNode(false);
        setDraggedNoteId(null);
    }, [isDraggingNode, draggedNoteId, notes]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    const addNote = async () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = (rect.width / 2 - offset.x) / scale;
        const centerY = (rect.height / 2 - offset.y) / scale;

        const newNoteData = {
            x: centerX - 100,
            y: centerY - 60,
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
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                background: "var(--color-bg)",
                cursor: isPanning ? "grabbing" : "auto",
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
                            width: 200,
                            background: note.color,
                            padding: 16,
                            borderRadius: 12,
                            boxShadow: "var(--shadow-md)",
                            border: "1px solid rgba(0,0,0,0.05)",
                            cursor: "default",
                            zIndex: activeEditId === note._id ? 1000 : 1,
                            color: "#1e293b"
                        }}
                        onMouseDown={(e) => {
                            if (activeEditId === note._id) return;
                            e.stopPropagation();
                            setIsDraggingNode(true);
                            setDraggedNoteId(note._id);
                            setMousePos({ x: e.clientX, y: e.clientY });
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
                                value={note.content}
                                onChange={(e) => updateNoteContent(note._id, e.target.value)}
                                onBlur={() => {
                                    saveContent(note._id, note.content);
                                    setActiveEditId(null);
                                }}
                                style={{
                                    width: "100%",
                                    height: 100,
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
                                    minHeight: 100,
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
            </div>

            {/* Top Tools */}
            <div
                style={{
                    position: "absolute",
                    top: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--color-surface)",
                    padding: "8px 16px",
                    borderRadius: 50,
                    display: "flex",
                    gap: 16,
                    boxShadow: "var(--shadow-lg)",
                    alignItems: "center",
                    border: "1px solid var(--color-border)",
                    zIndex: 1000
                }}
            >
                <button
                    onClick={addNote}
                    disabled={loading}
                    style={{
                        background: "var(--color-primary)",
                        color: "white",
                        border: "none",
                        borderRadius: 20,
                        padding: "6px 16px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    <StickyNote size={16} /> Add Note
                </button>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    <b>Alt+Left</b> Click • <b>Alt+Scroll</b> Zoom
                </div>
            </div>
        </div>
    );
};

export default CanvasPage;
