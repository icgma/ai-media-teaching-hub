"use client";

import { useState, useRef, useEffect } from "react";
import { streamRAG, Citation } from "@/lib/rag";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

interface RAGPanelProps {
  title: string;
  placeholder?: string;
  userRole: "teacher" | "student";
}

export default function RAGPanel({ title, placeholder = "输入你的问题...", userRole }: RAGPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/rag/status`)
      .then((res) => res.json())
      .then((data) => setInitialized(data.initialized))
      .catch(() => setInitialized(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    setError("");
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "", citations: [] }]);
    const token = localStorage.getItem("token") || "";
    try {
      await streamRAG(
        userMsg.content, token, userRole,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") last.content += chunk;
            return [...updated];
          });
        },
        (citations) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") last.citations = citations;
            return [...updated];
          });
        },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setStreaming(false);
    }
  };

  const suggestedQuestions = [
    "什么是CRISPE框架？",
    "设计一份Deepfake伦理讨论题",
    "倒金字塔结构的要点",
    "CoT思维链怎么用？",
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "640px",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        overflow: "hidden",
        animation: "fadeInUp 0.6s ease-out",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontFamily: "var(--font-chinese)",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--green-accent)",
              animation: "pulseGlow 2s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            RAG · 657 chunks
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {initialized === false && (
          <div
            style={{
              padding: "20px",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--red-accent)",
              fontSize: "13px",
              fontFamily: "var(--font-chinese)",
              textAlign: "center",
            }}
          >
            ⚠️ RAG 知识库未初始化。请联系管理员运行 /api/rag/ingest 接口导入课程资料。
          </div>
        )}
        {messages.length === 0 && initialized !== false && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
            }}
          >
            <span style={{ fontSize: "24px", color: "var(--gold-dim)", opacity: 0.3 }}>⟁</span>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-chinese)" }}>
              输入问题，AI 将检索课程资料后回答
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "500px" }}>
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    fontSize: "12px",
                    color: "var(--text-tertiary)",
                    cursor: "pointer",
                    fontFamily: "var(--font-chinese)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--gold-dim)";
                    e.currentTarget.style.color = "var(--gold-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-tertiary)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "14px 18px",
                  borderRadius: msg.role === "user"
                    ? "var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-md)"
                    : "var(--radius-md) var(--radius-md) var(--radius-md) var(--radius-sm)",
                  fontSize: "14px",
                  lineHeight: 1.7,
                  whiteSpace: msg.role === "user" ? "pre-wrap" : "normal",
                  fontFamily: "var(--font-body)",
                  background: msg.role === "user" ? "var(--gold-subtle)" : "var(--bg-elevated)",
                  color: msg.role === "user" ? "var(--gold-light)" : "var(--text-primary)",
                  border: msg.role === "user"
                    ? "1px solid var(--gold-border-faint)"
                    : "1px solid var(--border-subtle)",
                }}
              >
                {msg.role === "assistant" ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
                {msg.role === "assistant" && streaming && i === messages.length - 1 && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "2px",
                      height: "14px",
                      background: "var(--gold-primary)",
                      marginLeft: "4px",
                      animation: "pulseGlow 1s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            </div>
            {/* Citations */}
            {msg.citations && msg.citations.length > 0 && (
              <div style={{ marginTop: "8px", marginLeft: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {msg.citations.map((c, j) => (
                  <span
                    key={j}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--green-citation-border)",
                      background: "var(--green-citation-bg)",
                      fontSize: "11px",
                      color: "var(--green-accent)",
                    }}
                  >
                    [{c.week}] {c.filename.replace(".md", "")}
                    <span style={{ color: "var(--green-citation-dim)", marginLeft: "4px" }}>
                      {Math.round(c.relevance * 100)}%
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--red-accent)",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
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
              flex: 1,
              padding: "12px 16px",
              background: "var(--bg-deep)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
              transition: "border-color 0.3s ease",
              opacity: streaming ? 0.5 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--gold-dim)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            style={{
              padding: "12px 24px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "var(--font-chinese)",
              cursor: streaming || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              background: streaming || !input.trim()
                ? "var(--bg-hover)"
                : "linear-gradient(135deg, var(--gold-dim), var(--gold-primary))",
              color: streaming || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
              opacity: streaming || !input.trim() ? 0.5 : 1,
              letterSpacing: "0.05em",
            }}
          >
            {streaming ? "检索中..." : "提问"}
          </button>
        </div>
      </div>
    </div>
  );
}
