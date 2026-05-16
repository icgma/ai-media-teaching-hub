"use client";

import { useEffect, useState, RefObject } from "react";
import DashboardLoadingSkeleton from "./DashboardLoadingSkeleton";
import { useTheme } from "./ThemeProvider";
import { fetchWithAuth } from "@/lib/api";

interface TopicData {
  topic_id: string;
  topic_label: string;
  query_count: number;
}

interface HeatmapResponse {
  topics: TopicData[];
  max_count: number;
}

function parseColor(color: string): [number, number, number] {
  const hex = color.trim();
  if (hex.startsWith('#')) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }
  const m = hex.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return [0, 0, 0];
}

function interpolateHex(a: string, b: string, t: number): string {
  const pa = parseColor(a);
  const pb = parseColor(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function getHeatmapColors(): { low: string; mid: string; high: string } {
  if (typeof document === 'undefined') return { low: '#2a2a2a', mid: '#D4A853', high: '#C75B4A' };
  const style = getComputedStyle(document.documentElement);
  return {
    low: style.getPropertyValue('--heatmap-low').trim() || '#2a2a2a',
    mid: style.getPropertyValue('--heatmap-mid').trim() || '#D4A853',
    high: style.getPropertyValue('--heatmap-high').trim() || '#C75B4A',
  };
}

function heatmapColor(normalizedValue: number): string {
  const { low, mid, high } = getHeatmapColors();
  if (normalizedValue < 0.5) {
    return interpolateHex(low, mid, normalizedValue * 2);
  }
  return interpolateHex(mid, high, (normalizedValue - 0.5) * 2);
}

export default function KnowledgeHeatmap({
  token,
  kgIframeRef,
}: {
  token: string;
  kgIframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { theme } = useTheme();


  useEffect(() => {
    fetchWithAuth("/api/dashboard/heatmap", token)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <DashboardLoadingSkeleton />;
  if (!data || data.topics.length === 0) return null;

  const { topics, max_count } = data;

  function handleCellClick(topicId: string) {
    if (kgIframeRef.current?.contentWindow) {
      kgIframeRef.current.contentWindow.postMessage(
        { type: "highlight", nodeId: topicId },
        "*"
      );
    }
  }

  return (
    <div
      role="img"
      aria-label="知识点查询频率热力图"
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "24px",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "15px", fontFamily: "var(--font-chinese)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
          知识点覆盖热力图
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          Topic Frequency Heatmap
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          gap: "8px",
        }}
      >
        {topics.map((topic) => {
          const normalized = max_count > 0 ? topic.query_count / max_count : 0;
          const isHovered = hoveredId === topic.topic_id;
          return (
            <div
              key={topic.topic_id}
              onClick={() => handleCellClick(topic.topic_id)}
              onMouseEnter={() => setHoveredId(topic.topic_id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                borderRadius: "var(--radius-sm)",
                padding: "8px",
                minHeight: "64px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: heatmapColor(normalized),
                cursor: "pointer",
                transition: "transform 0.2s ease",
                transform: isHovered ? "scale(1.02)" : "scale(1)",
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: normalized > 0.6 ? "var(--heatmap-text-light)" : "var(--text-secondary)",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {topic.topic_label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: normalized > 0.6 ? "var(--heatmap-text-dim)" : "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                {topic.query_count}次
              </span>
              {isHovered && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-32px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    fontSize: "12px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  {topic.topic_label}: {topic.query_count} 次查询
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scale legend */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "16px" }}>
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>低频</span>
        <div
          style={{
            flex: 1,
            height: "8px",
            borderRadius: "4px",
            background: "linear-gradient(90deg, var(--heatmap-low), var(--heatmap-mid), var(--heatmap-high))",
          }}
        />
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>高频</span>
      </div>
    </div>
  );
}
