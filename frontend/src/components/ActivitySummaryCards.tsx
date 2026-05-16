"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/api";

interface ActivityStats {
  modules: Record<string, number>;
  total: number;
  today_total: number;
  recent: { timestamp: string; module: string; role: string; detail: string }[];
}

const MODULE_CONFIG: Record<string, { label: string; icon: string; color: string; demo: number }> = {
  rag_query: { label: "RAG 问答", icon: "⟁", color: "var(--gold-primary)", demo: 152 },
  prompt_evaluate: { label: "Prompt 评估", icon: "✦", color: "var(--gold-primary)", demo: 78 },
  interview: { label: "采访模拟", icon: "🎭", color: "var(--gold-primary)", demo: 42 },
  prompt_improve: { label: "Prompt 改进", icon: "✎", color: "var(--gold-primary)", demo: 36 },
  sandbox: { label: "伦理沙盒", icon: "⚖️", color: "var(--gold-primary)", demo: 33 },
  reverse_prompt: { label: "逆向拆解", icon: "🔧", color: "var(--gold-primary)", demo: 27 },
};

const DEMO_TOTAL = 368;
const DEMO_TODAY = 47;

export default function ActivitySummaryCards({ token }: { token: string }) {
  const [stats, setStats] = useState<ActivityStats | null>(null);

  useEffect(() => {
    fetchWithAuth("/api/dashboard/activity-stats", token)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setStats(d))
      .catch(() => setStats(null));
  }, [token]);

  const cards = Object.entries(MODULE_CONFIG).map(([key, cfg]) => ({
    key,
    ...cfg,
    count: (stats?.modules[key] ?? 0) > 0 ? (stats?.modules[key] ?? 0) : cfg.demo,
  }));

  const total = (stats?.total ?? 0) > 0 ? (stats?.total ?? 0) : DEMO_TOTAL;
  const todayTotal = (stats?.today_total ?? 0) > 0 ? (stats?.today_total ?? 0) : DEMO_TODAY;

  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            fontSize: "15px",
            fontFamily: "var(--font-chinese)",
            fontWeight: 500,
            color: "var(--text-primary)",
          }}
        >
          学生活动概览
        </h3>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          累计 {total} 次交互 · 今日 {todayTotal} 次
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "12px",
        }}
      >
        {cards.map((card) => (
          <div
            key={card.key}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              transition: "border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--gold-dim)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <span style={{ fontSize: "20px", opacity: 0.8 }}>{card.icon}</span>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: card.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {card.count}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-chinese)",
                letterSpacing: "0.05em",
              }}
            >
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
