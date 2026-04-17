import React, { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Minus, Maximize, StickyNote, Trash2, Move, Shrink, Focus } from "lucide-react";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import Avatar from "../common/Avatar";

interface Note {
    id: string; // Internal temporary ID or from server
    _id?: string;
    x: number;
    y: number;
    content: string;
    color: string;
    createdBy?: {
        _id: string;
        name: string;
        avatar?: string;
    };
    editedBy?: {
        _id: string;
        name: string;
        avatar?: string;
    }[];
}

const COLORS = ["#fef9c3", "#dcfce7", "#dbeafe", "#f3e8ff", "#fee2e2"];

interface ProjectCanvasProps {
    assignmentId: string;
    initialData?: any;
}

const ProjectCanvas: React.FC<ProjectCanvasProps> = ({ assignmentId, initialData }) => {
    const { user } = useAuthStore();
    const [notes, setNotes] = useState<Note[]>(initialData || []);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [isDraggingNode, setIsDraggingNode] = useState(false);
    const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
    const [activeEditId, setActiveEditId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isFullScreen, setIsFullScreen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Save notes to assignment
    const saveCanvas = async (updatedNotes: Note[]) => {
        try {
            await api.patch(`/assignments/${assignmentId}/canvas`, {
                canvasData: updatedNotes
            });
        } catch (error) {
            console.error("Failed to save project canvas", error);
        }
    };

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
            const updated = notes.map(n => n.id === draggedNoteId ? { ...n, x: n.x + dx, y: n.y + dy } : n);
            setNotes(updated);
            setMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const recordEdit = (noteId: string, currentNotes: Note[]): Note[] => {
        if (!user) return currentNotes;
        
        return currentNotes.map(n => {
            if (n.id !== noteId) return n;

            // If user is creator, no need to add to editedBy
            if (n.createdBy?._id === user._id) return n;

            const editors = n.editedBy || [];
            if (editors.find(e => e._id === user._id)) return n;

            return {
                ...n,
                editedBy: [...editors, { _id: user._id, name: user.name, avatar: user.avatar }]
            };
        });
    };

    const handleMouseUp = useCallback(() => {
        if (isDraggingNode && draggedNoteId) {
            const updated = recordEdit(draggedNoteId, notes);
            setNotes(updated);
            saveCanvas(updated);
        }
        setIsPanning(false);
        setIsDraggingNode(false);
        setDraggedNoteId(null);
    }, [isDraggingNode, draggedNoteId, notes, recordEdit, saveCanvas]);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    const addNote = () => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const centerX = (rect.width / 2 - offset.x) / scale;
        const centerY = (rect.height / 2 - offset.y) / scale;

        const newNote: Note = {
            id: Math.random().toString(36).substr(2, 9),
            x: centerX - 100,
            y: centerY - 60,
            content: "New Note",
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            createdBy: user ? { _id: user._id, name: user.name, avatar: user.avatar } : undefined,
            editedBy: []
        };

        const updated = [...notes, newNote];
        setNotes(updated);
        saveCanvas(updated);
    };

    const deleteNote = (id: string) => {
        const updated = notes.filter(n => n.id !== id);
        setNotes(updated);
        saveCanvas(updated);
    };

    const updateNoteContent = (id: string, content: string) => {
        setNotes(notes.map(n => n.id === id ? { ...n, content } : n));
    };

    const saveContent = (id: string, content: string) => {
        const updatedWithContent = notes.map(n => n.id === id ? { ...n, content } : n);
        const updated = recordEdit(id, updatedWithContent);
        setNotes(updated);
        saveCanvas(updated);
    };

    const resetView = () => {
        setScale(1);
        setOffset({ x: 0, y: 0 });
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: isFullScreen ? "fixed" : "relative",
                inset: isFullScreen ? 0 : "auto",
                height: isFullScreen ? "100vh" : 600,
                width: isFullScreen ? "100vw" : "100%",
                zIndex: isFullScreen ? 9999 : 1,
                borderRadius: isFullScreen ? 0 : 12,
                overflow: "hidden",
                background: "var(--color-bg)",
                cursor: isPanning ? "grabbing" : "auto",
                userSelect: "none",
                border: isFullScreen ? "none" : "1px solid var(--color-border)"
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
                        radial-gradient(circle at 1px 1px, var(--color-text-tertiary) 1px, transparent 0)
                    `,
                    backgroundSize: `${20 * scale}px ${20 * scale}px`,
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                    pointerEvents: "none",
                    opacity: 0.2
                }}
            />

            {/* Transform Container */}
            <div
                style={{
                    position: "absolute",
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    transformOrigin: "0 0",
                    transition: isPanning ? "none" : "transform 0.05s linear"
                }}
            >
                {notes.map(note => (
                    <div
                        key={note.id}
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
                            zIndex: activeEditId === note.id ? 1000 : 1,
                            color: "#1e293b"
                        }}
                        onMouseDown={(e) => {
                            if (activeEditId === note.id) return;
                            e.stopPropagation();
                            setIsDraggingNode(true);
                            setDraggedNoteId(note.id);
                            setMousePos({ x: e.clientX, y: e.clientY });
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, opacity: 0.4 }}>
                            <Move size={14} style={{ cursor: "grab" }} />
                            <Trash2
                                size={14}
                                style={{ cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                            />
                        </div>

                        {activeEditId === note.id ? (
                            <textarea
                                autoFocus
                                value={note.content}
                                onChange={(e) => updateNoteContent(note.id, e.target.value)}
                                onBlur={() => {
                                    saveContent(note.id, note.content);
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
                                onDoubleClick={() => setActiveEditId(note.id)}
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

                        <div style={{ fontSize: '0.6rem', opacity: 0.3, textAlign: 'right', marginTop: 8 }}>
                            Double click to edit
                        </div>

                        {/* Authorship Info */}
                        <div style={{ 
                            marginTop: 12, 
                            paddingTop: 8, 
                            borderTop: "1px solid rgba(0,0,0,0.05)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            {note.createdBy && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Avatar src={note.createdBy.avatar} name={note.createdBy.name} size={18} />
                                    <span style={{ fontSize: "0.65rem", fontWeight: 600, opacity: 0.6 }}>{note.createdBy.name}</span>
                                </div>
                            )}
                            
                            {note.editedBy && note.editedBy.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    {note.editedBy.slice(0, 3).map((editor, idx) => (
                                        <div key={editor._id} style={{ marginLeft: idx === 0 ? 0 : -6 }}>
                                            <Avatar 
                                                src={editor.avatar} 
                                                name={editor.name} 
                                                size={16} 
                                                style={{ border: "1px solid white" }}
                                            />
                                        </div>
                                    ))}
                                    {note.editedBy.length > 3 && (
                                        <span style={{ fontSize: "0.6rem", opacity: 0.4, marginLeft: 4 }}>
                                            +{note.editedBy.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls */}
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    background: "var(--color-surface)",
                    padding: "6px 10px",
                    borderRadius: 8,
                    display: "flex",
                    gap: 10,
                    boxShadow: "var(--shadow-md)",
                    alignItems: "center",
                    border: "1px solid var(--color-border)"
                }}
            >
                <button className="btn btn-ghost btn-xs" onClick={() => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) zoomTowards(Math.min(scale + 0.2, 5), rect.width / 2, rect.height / 2);
                }}><Plus size={14} /></button>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, width: 35, textAlign: "center" }}>{Math.round(scale * 100)}%</span>
                <button className="btn btn-ghost btn-xs" onClick={() => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) zoomTowards(Math.max(scale - 0.2, 0.1), rect.width / 2, rect.height / 2);
                }}><Minus size={14} /></button>
                <div style={{ width: 1, height: 16, background: "var(--color-border)" }} />
                <button className="btn btn-ghost btn-xs" onClick={resetView} title="Reset View"><Focus size={14} /></button>
                <button 
                    className={`btn ${isFullScreen ? 'btn-primary' : 'btn-ghost'} btn-xs`} 
                    onClick={() => setIsFullScreen(!isFullScreen)} 
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Shrink size={14} /> : <Maximize size={14} />}
                </button>
            </div>

            {/* Top Toolbar */}
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    display: "flex",
                    gap: 8,
                    zIndex: 100
                }}
            >
                <button
                    onClick={addNote}
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 20, boxShadow: "var(--shadow-md)" }}
                >
                    <StickyNote size={14} /> Add Note
                </button>
                <div style={{ 
                    background: "rgba(255,255,255,0.8)", 
                    padding: "4px 12px", 
                    borderRadius: 20, 
                    fontSize: "0.7rem", 
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid var(--color-border)"
                }}>
                    <span style={{ fontWeight: 600 }}>Collaborative Whiteboard</span>
                    <span style={{ opacity: 0.5 }}>|</span>
                    <span><b>Alt+Left</b> Click • <b>Alt+Scroll</b> Zoom</span>
                </div>
            </div>
        </div>
    );
};

export default ProjectCanvas;
