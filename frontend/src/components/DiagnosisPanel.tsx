"use client";

import { useState, useRef, useEffect } from "react";
import { streamDiagnosis } from "@/lib/diagnosis";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function DiagnosisPanel() {
  const [selectedHw, setSelectedHw] = useState("HW1");
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content]);

  const handleStartDiagnosis = async () => {
    setContent("");
    setError("");
    setIsStreaming(true);
    
    const token = localStorage.getItem("token") || "";
    try {
      await streamDiagnosis(selectedHw, token, (chunk) => {
        setContent((prev) => prev + chunk);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "诊断失败");
    } finally {
      setIsStreaming(false);
    }
  };

  const hws = ["HW1", "HW2", "HW3", "HW_Final"];
  const hwLabels: Record<string, string> = {
    HW1: "作业1",
    HW2: "作业2",
    HW3: "作业3",
    HW_Final: "期末项目",
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "600px",
        animation: "fadeInUp 0.6s ease-out 0.2s both",
      }}
    >
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {hws.map((hw) => (
            <button
              key={hw}
              onClick={() => setSelectedHw(hw)}
              disabled={isStreaming}
              style={{
                padding: "6px 16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid",
                borderColor: selectedHw === hw ? "var(--gold-dim)" : "var(--border)",
                background: selectedHw === hw ? "var(--gold-select-bg)" : "transparent",
                color: selectedHw === hw ? "var(--gold-primary)" : "var(--text-tertiary)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: isStreaming ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {hwLabels[hw] || hw}
            </button>
          ))}
        </div>
        <button
          onClick={handleStartDiagnosis}
          disabled={isStreaming}
          style={{
            padding: "8px 20px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: isStreaming ? "var(--bg-hover)" : "var(--gold-dim)",
            color: isStreaming ? "var(--text-muted)" : "var(--bg-deep)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: isStreaming ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isStreaming ? "正在诊断..." : "开始 AI 诊断"}
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: "24px",
          overflowY: "auto",
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          lineHeight: 1.8,
          color: "var(--text-primary)",
          whiteSpace: "normal",
          background: "var(--bg-deep)",
        }}
      >
        {!content && !isStreaming && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: 0.3 }}>
            <span style={{ fontSize: "32px", marginBottom: "16px" }}>🔍</span>
            <p style={{ fontSize: "13px" }}>选择作业并点击上方按钮开始深度诊断分析</p>
          </div>
        )}
        <div className="markdown-body" style={{ color: "inherit" }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h3: ({ ...props }) => <h3 style={{ fontSize: "18px", fontWeight: 600, marginTop: "24px", marginBottom: "12px", color: "var(--gold-light)" }} {...props} />,
              h4: ({ ...props }) => <h4 style={{ fontSize: "16px", fontWeight: 600, marginTop: "20px", marginBottom: "8px", color: "var(--text-primary)" }} {...props} />,
              p: ({ ...props }) => <p style={{ marginBottom: "12px", lineHeight: 1.8 }} {...props} />,
              ul: ({ ...props }) => <ul style={{ paddingLeft: "24px", marginBottom: "12px", listStyleType: "disc" }} {...props} />,
              li: ({ ...props }) => <li style={{ marginBottom: "6px" }} {...props} />,
              strong: ({ ...props }) => <strong style={{ color: "var(--gold-dim)", fontWeight: 600 }} {...props} />,
              hr: ({ ...props }) => <hr style={{ border: "0", borderTop: "1px solid var(--border-subtle)", margin: "24px 0" }} {...props} />
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
        {isStreaming && (
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
        {error && (
          <div style={{ color: "var(--red-accent)", padding: "12px", borderRadius: "var(--radius-sm)", background: "var(--error-bg)", border: "1px solid var(--error-border)" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
