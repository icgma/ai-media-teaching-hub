"use client";

import { useState, useEffect } from "react";
import { getWeakPoints, WeakPoint } from "@/lib/diagnosis";

export default function WeakPointSummary() {
  const [weakPoints, setWeakPoints] = useState<WeakPoint[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    getWeakPoints(token)
      .then((data) => {
        setWeakPoints(data.weak_points);
        setSummary(data.summary);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
      加载薄弱环节数据中...
    </div>
  );

  if (error) return (
    <div style={{ padding: "20px", color: "var(--red-accent)", background: "var(--error-bg)", borderRadius: "var(--radius-sm)" }}>
      Error: {error}
    </div>
  );

  // Show top gaps
  const sortedWeakPoints = [...weakPoints].sort((a, b) => b.gap - a.gap).slice(0, 5);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "24px",
        marginBottom: "24px",
        animation: "fadeInUp 0.6s ease-out",
      }}
    >
      <h3
        style={{
          fontSize: "16px",
          color: "var(--text-primary)",
          marginBottom: "20px",
          fontFamily: "var(--font-chinese)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ color: "var(--red-accent)" }}>⚠️</span> 
        全班知识薄弱环节 (TOP 5 Gaps)
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {sortedWeakPoints.map((wp, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    background: "var(--bg-hover)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    color: "var(--text-muted)",
                  }}
                >
                  {wp.hw_id}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-secondary)" }}>
                  {wp.dimension}
                </span>
                {wp.zero_count > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      background: "var(--error-bg)",
                      color: "var(--red-accent)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {wp.zero_count}人未提交
                  </span>
                )}
              </div>
              <span style={{ fontSize: "12px", color: "var(--red-accent)", fontWeight: 600 }}>
                缺口: {wp.gap.toFixed(1)}
              </span>
            </div>
            <div
              style={{
                height: "6px",
                background: "var(--bg-deep)",
                borderRadius: "3px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(wp.avg_score / wp.max_score) * 100}%`,
                  background: "var(--gold-dim)",
                  borderRadius: "3px",
                  transition: "width 1s ease-out",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  height: "100%",
                  width: `${(wp.gap / wp.max_score) * 100}%`,
                  background: "var(--red-gap-bar)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
              <span>后25%均分: {wp.avg_score.toFixed(1)}</span>
              <span>满分: {wp.max_score}</span>
            </div>
          </div>
        ))}
      </div>

      {sortedWeakPoints.length > 0 && (
        <div style={{ marginTop: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const tab = document.querySelector<HTMLElement>('[data-tab="rag"]');
              tab?.click();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--gold-dim)",
              background: "transparent",
              color: "var(--gold-primary)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-chinese)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--gold-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            ⟁ RAG 备课 — 生成针对性教案
          </button>
          <button
            onClick={() => {
              const tab = document.querySelector<HTMLElement>('[data-tab="insight"]');
              tab?.click();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontWeight: 500,
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
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            ◎ 启动 AI 深度诊断
          </button>
        </div>
      )}
      
      {summary && (
        <div style={{ marginTop: "16px", padding: "12px 16px", background: "var(--gold-summary-bg)", borderRadius: "var(--radius-sm)", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {summary}
        </div>
      )}

      {weakPoints.length === 0 && (
        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
          暂无诊断数据，请确保成绩单已上传。
        </div>
      )}
    </div>
  );
}
