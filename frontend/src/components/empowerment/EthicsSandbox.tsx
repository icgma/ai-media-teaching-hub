"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface Scenario {
  id: string;
  title: string;
  content: string;
  hint: string;
}

export default function EthicsSandbox({ token }: { token: string }) {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/empower/sandbox/scenario`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setScenario(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!input.trim() || !scenario || isStreaming) return;

    setFeedback("");
    setIsStreaming(true);

    try {
      const response = await fetch(`${API_URL}/api/empower/sandbox/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scenario_id: scenario.id, student_prompt: input }),
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
                setFeedback((prev) => prev + data.content);
              } catch {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setFeedback("网络错误，无法连接到评估引擎。");
    } finally {
      setIsStreaming(false);
    }
  };

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: "24px" }}>加载情境中...</div>;
  }

  if (!scenario) {
    return <div style={{ color: "var(--red-accent)", padding: "24px" }}>无法加载沙盒情境。</div>;
  }

  return (
    <div style={{ display: "flex", gap: "24px", height: "600px" }}>
      {/* Left: Scenario */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "var(--text-primary)" }}>
            📄 案例材料: {scenario.title}
          </h3>
        </div>
        <div style={{ padding: "24px", flex: 1, overflowY: "auto", fontSize: "15px", lineHeight: 1.8, color: "var(--text-secondary)", fontFamily: "var(--font-chinese)", whiteSpace: "pre-wrap" }}>
          {scenario.content}
        </div>
        <div style={{ padding: "16px", background: "var(--gold-select-bg)", borderTop: "1px solid var(--gold-dim)" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--gold-primary)", display: "flex", gap: "8px" }}>
            <span>💡</span> {scenario.hint}
          </p>
        </div>
      </div>

      {/* Right: Input & Feedback */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--bg-card)", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-deep)" }}>
            <h4 style={{ margin: 0, fontSize: "14px", color: "var(--text-primary)" }}>你的找茬报告</h4>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请指出左侧文本中存在的伦理、常识或规范错误，并给出你的修改建议..."
            style={{
              flex: 1,
              padding: "16px",
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "14px",
              lineHeight: 1.6,
              resize: "none",
              outline: "none"
            }}
          />
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", textAlign: "right" }}>
            <button
              onClick={handleSubmit}
              disabled={isStreaming || !input.trim()}
              style={{
                padding: "8px 24px",
                background: isStreaming || !input.trim() ? "var(--bg-hover)" : "var(--gold-primary)",
                color: isStreaming || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                fontWeight: 600,
                cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {isStreaming ? "AI 评估中..." : "提交评估"}
            </button>
          </div>
        </div>

        {/* Feedback Display */}
        {(feedback || isStreaming) && (
          <div style={{ flex: 1, border: "1px solid var(--gold-dim)", borderRadius: "var(--radius-md)", background: "var(--gold-summary-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--gold-dim)", background: "var(--gold-border-faint)" }}>
              <h4 style={{ margin: 0, fontSize: "14px", color: "var(--gold-light)" }}>导师点评</h4>
            </div>
            <div className="markdown-body" style={{ flex: 1, padding: "20px", overflowY: "auto", fontSize: "14px", lineHeight: 1.6, color: "var(--text-primary)" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
              {isStreaming && (
                <span style={{ display: "inline-block", width: "4px", height: "14px", background: "var(--gold-primary)", marginLeft: "4px", animation: "pulseGlow 1s infinite" }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
