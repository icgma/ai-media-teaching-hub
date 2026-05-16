"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function ReversePromptAnalyzer({ token }: { token: string }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim() || isStreaming) return;

    setResult("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_URL}/api/empower/reverse-prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ article_text: input }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
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
                setResult((prev) => prev + data.content);
              } catch {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setResult("网络错误，无法完成反向拆解。");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "24px", height: "600px" }}>
      {/* Left: Input */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🔍</span> 输入生成内容
          </h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-tertiary)" }}>
            粘贴一篇由大模型生成的文章、脚本或文案，AI将反向推导其原始提示词。
          </p>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="在此粘贴 AI 生成的内容文本..."
          style={{
            flex: 1,
            padding: "24px",
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            fontSize: "14px",
            lineHeight: 1.8,
            resize: "none",
            outline: "none"
          }}
        />
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", textAlign: "right", background: "var(--bg-deep)" }}>
          <button
            onClick={handleAnalyze}
            disabled={isStreaming || !input.trim()}
            style={{
              padding: "10px 28px",
              background: isStreaming || !input.trim() ? "var(--bg-hover)" : "var(--gold-primary)",
              color: isStreaming || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {isStreaming ? "正在逆向拆解..." : "开始反向拆解"}
          </button>
        </div>
      </div>

      {/* Right: Output */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--gold-summary-bg)" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--gold-primary)" }}>
            反推提示词结构 (Reverse-Engineered Prompt)
          </h3>
        </div>
        <div className="markdown-body" style={{ flex: 1, padding: "24px", overflowY: "auto", fontSize: "14px", lineHeight: 1.6, color: "var(--text-primary)" }}>
          {!result && !isStreaming ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              等待拆解...
            </div>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              {isStreaming && (
                <span style={{ display: "inline-block", width: "4px", height: "14px", background: "var(--gold-primary)", marginLeft: "4px", animation: "pulseGlow 1s infinite" }} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
