"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function InterviewSimulator({ token }: { token: string }) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "你找我？哎呀……我其实不太想惹麻烦，就看到了那么一点点。你想问什么？" }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const updatedMessages = [...messages, userMsg];

    try {
      const response = await fetch(`${API_URL}/api/empower/interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.slice(6));
                setMessages((prev) => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1].content += data.content;
                  return newMsgs;
                });
              } catch {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "网络错误，请重试。" }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "600px", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", overflow: "hidden" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "var(--gold-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🎭</span> 沉浸式采访：不愿透露姓名的目击者
        </h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-tertiary)" }}>
          场景：市中心突发新能源车起火。目标：通过连贯、有技巧的 Prompt 提问，套出关键的 5W1H 要素。
        </p>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <span style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "4px", marginLeft: "4px", marginRight: "4px" }}>
              {msg.role === "user" ? "你 (记者)" : "目击者 (AI)"}
            </span>
            <div style={{
              maxWidth: "80%",
              padding: "12px 16px",
              borderRadius: "12px",
              borderTopRightRadius: msg.role === "user" ? "4px" : "12px",
              borderTopLeftRadius: msg.role === "assistant" ? "4px" : "12px",
              background: msg.role === "user" ? "var(--gold-dim)" : "var(--bg-elevated)",
              color: msg.role === "user" ? "var(--bg-deep)" : "var(--text-primary)",
              border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              fontSize: "14px",
              lineHeight: 1.6
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "13px", padding: "8px" }}>
             <span style={{ animation: "pulseGlow 1.5s infinite" }}>●</span>
             <span style={{ animation: "pulseGlow 1.5s infinite", animationDelay: "0.2s" }}>●</span>
             <span style={{ animation: "pulseGlow 1.5s infinite", animationDelay: "0.4s" }}>●</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "12px", background: "var(--bg-deep)" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="请输入你的采访问题..."
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: "12px 16px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{
            padding: "0 24px",
            background: isStreaming || !input.trim() ? "var(--bg-hover)" : "var(--gold-primary)",
            color: isStreaming || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontWeight: 600,
            cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}
        >
          发送
        </button>
      </form>
    </div>
  );
}
