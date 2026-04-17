import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, Sparkles, Trash2, User } from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
    isStreaming?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ─── Simple Markdown Renderer ─── */
const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];
    let listType: "ul" | "ol" | null = null;
    let key = 0;

    const flushList = () => {
        if (listItems.length > 0 && listType) {
            const Tag = listType;
            elements.push(
                <Tag key={key++} style={{ margin: "6px 0", paddingLeft: 20 }}>
                    {listItems}
                </Tag>
            );
            listItems = [];
            listType = null;
        }
    };

    const renderInline = (line: string): React.ReactNode => {
        // Process inline markdown: **bold**, *italic*, `code`
        const parts: React.ReactNode[] = [];
        let remaining = line;
        let i = 0;

        while (remaining.length > 0) {
            // Bold **text**
            const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
            // Inline code `text`
            const codeMatch = remaining.match(/`([^`]+)`/);

            // Collect all matches with their positions
            const candidates: { match: RegExpMatchArray; type: string }[] = [];
            if (boldMatch) candidates.push({ match: boldMatch, type: "bold" });
            if (codeMatch) candidates.push({ match: codeMatch, type: "code" });

            // Sort by position — earliest match wins
            candidates.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));
            const firstMatch = candidates.length > 0 ? candidates[0] : null;

            if (!firstMatch) {
                parts.push(remaining);
                break;
            }

            const before = remaining.slice(0, firstMatch.match.index!);
            if (before) parts.push(before);

            if (firstMatch.type === "bold") {
                parts.push(<strong key={`${i}-b`}>{firstMatch.match[1]}</strong>);
            } else if (firstMatch.type === "code") {
                parts.push(
                    <code
                        key={`${i}-c`}
                        style={{
                            background: "rgba(0,0,0,0.06)",
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontSize: "0.85em",
                            fontFamily: "monospace",
                        }}
                    >
                        {firstMatch.match[1]}
                    </code>
                );
            } else if (firstMatch.type === "italic") {
                parts.push(<em key={`${i}-i`}>{firstMatch.match[1]}</em>);
            }

            remaining = remaining.slice(firstMatch.match.index! + firstMatch.match[0].length);
            i++;
        }

        return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
    };

    for (const line of lines) {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith("### ")) {
            flushList();
            elements.push(
                <h4 key={key++} style={{ fontSize: "0.9rem", fontWeight: 700, margin: "10px 0 4px", color: "#1e293b" }}>
                    {renderInline(trimmed.slice(4))}
                </h4>
            );
            continue;
        }
        if (trimmed.startsWith("## ")) {
            flushList();
            elements.push(
                <h3 key={key++} style={{ fontSize: "0.95rem", fontWeight: 700, margin: "10px 0 4px", color: "#1e293b" }}>
                    {renderInline(trimmed.slice(3))}
                </h3>
            );
            continue;
        }

        // Unordered list
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            if (listType !== "ul") flushList();
            listType = "ul";
            listItems.push(
                <li key={key++} style={{ marginBottom: 2, fontSize: "0.875rem", lineHeight: 1.5 }}>
                    {renderInline(trimmed.slice(2))}
                </li>
            );
            continue;
        }

        // Ordered list
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
        if (orderedMatch) {
            if (listType !== "ol") flushList();
            listType = "ol";
            listItems.push(
                <li key={key++} style={{ marginBottom: 2, fontSize: "0.875rem", lineHeight: 1.5 }}>
                    {renderInline(orderedMatch[2])}
                </li>
            );
            continue;
        }

        // Empty line
        if (!trimmed) {
            flushList();
            elements.push(<div key={key++} style={{ height: 6 }} />);
            continue;
        }

        // Regular paragraph
        flushList();
        elements.push(
            <p key={key++} style={{ margin: "2px 0", fontSize: "0.875rem", lineHeight: 1.6 }}>
                {renderInline(trimmed)}
            </p>
        );
    }

    flushList();
    return elements;
};

/* ─── Quick Suggestions Per Page ─── */
const getPageSuggestions = (path: string): string[] => {
    const suggestions: Record<string, string[]> = {
        "/dashboard": ["What do the dashboard stats mean?", "How do I track overdue tasks?", "Show me my team overview"],
        "/assignments": ["How do I create a project?", "How to add team members to a project?", "How to filter assignments?"],
        "/tasks": ["How do I create a task?", "How to change task priority?", "How to use bulk actions?"],
        "/clients": ["How do I add a company?", "How to import from Excel?", "How to add contacts?"],
        "/teams": ["How to invite team members?", "What are team roles?", "How to create a team?"],
        "/calendar": ["What do the colors mean?", "How to filter by project?", "How to export the calendar?"],
        "/reports": ["How to generate a report?", "How to export as PDF?", "What report types are available?"],
        "/settings": ["How to change my password?", "How to enable dark mode?", "How to set up notifications?"],
    };

    return suggestions[path] || ["What can I do on this page?", "How do I create a task?", "Help me navigate"];
};

/* ─── Buddy Component ─── */
const Buddy: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const location = useLocation();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Get current page context (Title, H1, etc.)
    const pageContext = {
        title: document.title,
        header: document.querySelector('h1')?.innerText || document.querySelector('h2')?.innerText || '',
        path: location.pathname
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen]);

    const clearChat = () => {
        setMessages([]);
        setIsLoading(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const sendMessage = useCallback(
        async (overrideMessage?: string) => {
            const userMessage = (overrideMessage || input).trim();
            if (!userMessage || isLoading) return;

            const userMsg: Message = { role: "user", content: userMessage };
            const newMessages = [...messages, userMsg];
            setMessages(newMessages);
            setInput("");
            setIsLoading(true);

            // Create placeholder assistant message for streaming
            const assistantPlaceholder: Message = { role: "assistant", content: "", isStreaming: true };
            setMessages([...newMessages, assistantPlaceholder]);

            const abortController = new AbortController();
            abortControllerRef.current = abortController;

            try {
                // Build history for context (last 10 messages)
                const history = newMessages.slice(-10).map((m) => ({
                    role: m.role,
                    content: m.content,
                }));

                const response = await fetch(`${API_BASE}/buddy/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: userMessage,
                        path: location.pathname,
                        context: pageContext,
                        history,
                    }),
                    signal: abortController.signal,
                });

                if (!response.ok || !response.body) {
                    // Fallback to non-streaming endpoint
                    const fallbackRes = await fetch(`${API_BASE}/buddy`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: userMessage, path: location.pathname, context: pageContext, history }),
                    });
                    const fallbackData = await fallbackRes.json();
                    setMessages([...newMessages, { role: "assistant", content: fallbackData.reply || "I'm here to help! What would you like to know about FlowDesk?" }]);
                    setIsLoading(false);
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullContent = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

                    for (const line of lines) {
                        const data = line.slice(6).trim();
                        if (data === "[DONE]") continue;

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullContent += parsed.content;
                                setMessages([...newMessages, { role: "assistant", content: fullContent, isStreaming: true }]);
                            }
                        } catch {
                            // Skip unparseable
                        }
                    }
                }

                // Finalize message (remove streaming flag)
                setMessages([...newMessages, { role: "assistant", content: fullContent || "I'm here to help! What would you like to know about FlowDesk?" }]);
            } catch (err: any) {
                if (err.name === "AbortError") return;

                // Fallback to non-streaming
                try {
                    const history = newMessages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
                    const res = await fetch(`${API_BASE}/buddy`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ message: userMessage, path: location.pathname, history }),
                    });
                    const data = await res.json();
                    setMessages([...newMessages, { role: "assistant", content: data.reply || "I'm here to help! Ask me anything about FlowDesk." }]);
                } catch {
                    setMessages([
                        ...newMessages,
                        {
                            role: "assistant",
                            content: "I'm here to help! 👋\n\nUse the **sidebar** to navigate between pages. Each page has a **Create** button (top right) for adding new items.\n\nWhat would you like to do?",
                        },
                    ]);
                }
            } finally {
                setIsLoading(false);
                abortControllerRef.current = null;
            }
        },
        [input, messages, isLoading, location.pathname]
    );

  const quickQuestions = ["What does this page do?", "How do I create a task?", "How to invite team members?", "Where can I upload files?"];

    return (
        <>
            {/* Floating trigger button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: "fixed",
                    bottom: 80,
                    right: 24,
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 8px 32px rgba(79, 70, 229, 0.4)",
                    zIndex: 1000,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.1)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(79, 70, 229, 0.5)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(79, 70, 229, 0.4)";
                }}
                title="Open FlowDesk Buddy"

            >
                {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
            </div>

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        bottom: 92,
                        right: 24,
                        width: 420,
                        height: 580,
                        background: "#ffffff",
                        borderRadius: 16,
                        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        zIndex: 999,
                        animation: "buddySlideUp 0.3s ease-out",
                    }}
                >
                    <style>{`
                        @keyframes buddySlideUp {
                            from { opacity: 0; transform: translateY(20px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        @keyframes buddyPulse {
                            0%, 100% { opacity: 0.4; }
                            50% { opacity: 1; }
                        }
                        @keyframes buddyCursor {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0; }
                        }
                    `}</style>

                    {/* Header */}
                    <div
                        style={{
                            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                            padding: "16px 20px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexShrink: 0,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "rgba(255,255,255,0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <Sparkles size={18} color="white" />
                            </div>
                            <div>
                                <h3 style={{ color: "white", fontSize: "1rem", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>FlowDesk Buddy</h3>
                                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", margin: 0 }}>
                                    {isLoading ? "Thinking..." : "Ask me anything"}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    style={{
                                        background: "rgba(255,255,255,0.15)",
                                        border: "none",
                                        borderRadius: 8,
                                        padding: 8,
                                        cursor: "pointer",
                                        color: "rgba(255,255,255,0.8)",
                                        display: "flex",
                                        alignItems: "center",
                                    }}
                                    title="Clear chat"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: "rgba(255,255,255,0.15)",
                                    border: "none",
                                    borderRadius: 8,
                                    padding: 8,
                                    cursor: "pointer",
                                    color: "rgba(255,255,255,0.8)",
                                    display: "flex",
                                    alignItems: "center",
                                }}
                                title="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Messages area */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "16px 16px 8px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 16,
                            background: "#fafafa",
                        }}
                    >
                        {/* Empty state */}
                        {messages.length === 0 && (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "20px 0" }}>
                                <div
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 16,
                                    }}
                                >
                                    <Bot size={28} color="#6366f1" />
                                </div>
                                <p style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", margin: "0 0 4px" }}>Hi! I'm FlowDesk Buddy</p>
                                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 20px", textAlign: "center" }}>
                                    Your intelligent assistant for everything in FlowDesk
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                                    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        Suggested questions
                                    </p>
                                    {suggestions.map((q, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => sendMessage(q)}
                                            style={{
                                                background: "white",
                                                border: "1px solid #e2e8f0",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                fontSize: "0.85rem",
                                                color: "#475569",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                transition: "all 0.15s ease",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = "#f1f5f9";
                                                e.currentTarget.style.borderColor = "#6366f1";
                                                e.currentTarget.style.color = "#4f46e5";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = "white";
                                                e.currentTarget.style.borderColor = "#e2e8f0";
                                                e.currentTarget.style.color = "#475569";
                                            }}
                                        >
                                            <MessageCircle size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        {messages.filter(m => m.role === 'user' || m.content !== '').map((msg, i) => (
                            <div key={i} style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                                {/* Avatar */}
                                <div
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: "50%",
                                        background: msg.role === "user" ? "linear-gradient(135deg, #6366f1, #7c3aed)" : "linear-gradient(135deg, #e0e7ff, #ede9fe)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        marginTop: 2,
                                    }}
                                >
                                    {msg.role === "user" ? <User size={14} color="white" /> : <Sparkles size={14} color="#6366f1" />}
                                </div>

                                {/* Message bubble */}
                                <div
                                    style={{
                                        maxWidth: "82%",
                                        padding: "10px 14px",
                                        borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                        background: msg.role === "user" ? "linear-gradient(135deg, #4f46e5, #6366f1)" : "white",
                                        color: msg.role === "user" ? "white" : "#1e293b",
                                        boxShadow: msg.role === "user" ? "0 2px 8px rgba(79, 70, 229, 0.2)" : "0 1px 4px rgba(0, 0, 0, 0.06)",
                                        border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                                    }}
                                >
                                    {msg.role === "user" ? (
                                        <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6 }}>{msg.content}</p>
                                    ) : (
                                        <div>
                                            {renderMarkdown(msg.content)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isLoading && messages[messages.length - 1]?.content === "" && (
                            <div style={{ display: "flex", gap: 10 }}>
                                <div
                                    style={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: "50%",
                                        background: "linear-gradient(135deg, #e0e7ff, #ede9fe)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Sparkles size={14} color="#6366f1" />
                                </div>
                                <div
                                    style={{
                                        background: "white",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "14px 14px 14px 4px",
                                        padding: "12px 18px",
                                        display: "flex",
                                        gap: 5,
                                        alignItems: "center",
                                    }}
                                >
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            style={{
                                                width: 7,
                                                height: 7,
                                                borderRadius: "50%",
                                                background: "#6366f1",
                                                animation: `buddyPulse 1.4s ease-in-out infinite`,
                                                animationDelay: `${i * 0.2}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div
                        style={{
                            padding: "12px 16px 16px",
                            background: "white",
                            borderTop: "1px solid #f1f5f9",
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                background: "#f8fafc",
                                borderRadius: 12,
                                border: "1px solid #e2e8f0",
                                padding: "4px 4px 4px 14px",
                                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#6366f1";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#e2e8f0";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
                                placeholder="Ask anything about FlowDesk..."
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    fontSize: "0.875rem",
                                    color: "#1e293b",
                                    padding: "8px 0",
                                }}
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    border: "none",
                                    background: input.trim() ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#e2e8f0",
                                    color: input.trim() ? "white" : "#94a3b8",
                                    cursor: input.trim() && !isLoading ? "pointer" : "default",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s ease",
                                    flexShrink: 0,
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                        <p style={{ fontSize: "0.7rem", color: "#94a3b8", textAlign: "center", margin: "8px 0 0", lineHeight: 1.3 }}>
                            Powered by FlowDesk AI · Ask about any feature
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default Buddy;
