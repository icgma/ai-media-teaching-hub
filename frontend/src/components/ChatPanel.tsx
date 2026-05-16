"use client";

import { useState, useRef, useEffect } from "react";
import { streamChat } from "@/lib/stream";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  title: string;
  placeholder?: string;
  systemPrompt?: string;
  userRole: "teacher" | "student";
}

export default function ChatPanel({ title, placeholder = "输入你的问题...", systemPrompt, userRole }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    setError("");
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    const token = localStorage.getItem("token") || "";
    try {
      await streamChat(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        token, userRole,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") last.content += chunk;
            return updated;
          });
        },
        systemPrompt,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "600px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "13px", fontFamily: "var(--font-chinese)", color: "var(--text-secondary)", fontWeight: 500 }}>{title}</span>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {userRole === "teacher" ? "DeepSeek" : "MiniMax"}
        </span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-chinese)" }}>输入问题开始对话</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div
              style={{
                maxWidth: "80%",
                padding: "14px 18px",
                borderRadius: "var(--radius-md)",
                fontSize: "14px",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                background: msg.role === "user" ? "var(--gold-subtle)" : "var(--bg-elevated)",
                color: msg.role === "user" ? "var(--gold-light)" : "var(--text-primary)",
                border: msg.role === "user" ? "1px solid var(--gold-border-faint)" : "1px solid var(--border-subtle)",
              }}
            >
              {msg.content}
              {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                <span style={{ display: "inline-block", width: "2px", height: "14px", background: "var(--gold-primary)", marginLeft: "4px", animation: "pulseGlow 1s ease-in-out infinite" }} />
              )}
            </div>
          </div>
        ))}
        {error && (
          <div style={{ padding: "10px 14px", background: "var(--error-bg)", border: "1px solid var(--error-border)", borderRadius: "var(--radius-sm)", color: "var(--red-accent)", fontSize: "13px" }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={placeholder}
            disabled={streaming}
            style={{
              flex: 1, padding: "12px 16px", background: "var(--bg-deep)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "14px",
              fontFamily: "var(--font-body)", outline: "none", transition: "border-color 0.3s ease",
              opacity: streaming ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            style={{
              padding: "12px 24px", borderRadius: "var(--radius-sm)", border: "none",
              fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-chinese)",
              cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              background: streaming || !input.trim() ? "var(--bg-hover)" : "linear-gradient(135deg, var(--gold-dim), var(--gold-primary))",
              color: streaming || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
              opacity: streaming || !input.trim() ? 0.5 : 1, letterSpacing: "0.05em",
            }}
          >
            {streaming ? "生成中..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}
