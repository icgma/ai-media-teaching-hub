"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
import { fetchWithAuth } from "@/lib/api";

const HW_TABS = ["HW1", "HW2", "HW3"];
const AXES = [
  { key: "prompting", label: "提示词工程" },
  { key: "newswriting", label: "新闻写作" },
  { key: "ethics", label: "伦理素养" },
];

const HW_COLORS: Record<string, { stroke: string; fill: string }> = {
  HW1: { stroke: "var(--gold-dim)", fill: "rgba(212, 168, 83, 0.08)" },
  HW2: { stroke: "var(--gold-primary)", fill: "rgba(212, 168, 83, 0.15)" },
  HW3: { stroke: "#e8a030", fill: "rgba(232, 160, 48, 0.22)" },
};

interface PerformanceResponse {
  student_id: string;
  hw: string;
  scores: Record<string, number>;
  class_avg: Record<string, number>;
  error?: string;
  status?: number;
}

export default function StudentRadarChart({
  studentId,
  token,
  onError,
}: {
  studentId: string;
  token: string;
  onError: (msg: string | null) => void;
}) {
  const [activeHW, setActiveHW] = useState("HW1");
  const [data, setData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGrowth, setShowGrowth] = useState(false);
  const [allHwData, setAllHwData] = useState<Record<string, PerformanceResponse>>({});

  // Single HW fetch
  useEffect(() => {
    if (!studentId || showGrowth) return;
    setLoading(true);
    onError(null);
    fetchWithAuth(
      `/api/student/performance?student_id=${encodeURIComponent(studentId)}&hw=${activeHW}`,
      token
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d.error) {
          onError(d.error);
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        onError("数据加载失败，请刷新页面重试");
        setData(null);
        setLoading(false);
      });
  }, [studentId, activeHW, token, onError, showGrowth]);

  // Growth mode: fetch all HWs
  const fetchAllHw = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    onError(null);
    const results: Record<string, PerformanceResponse> = {};
    const promises = HW_TABS.map(async (hw) => {
      try {
        const r = await fetchWithAuth(
          `/api/student/performance?student_id=${encodeURIComponent(studentId)}&hw=${hw}`,
          token
        );
        if (!r.ok) return;
        const d = await r.json();
        if (!d.error) results[hw] = d;
      } catch {
        // skip failed
      }
    });
    await Promise.all(promises);
    setAllHwData(results);
    setLoading(false);
  }, [studentId, token, onError]);

  useEffect(() => {
    if (showGrowth) fetchAllHw();
  }, [showGrowth, fetchAllHw]);

  if (loading) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontSize: "14px",
        }}
      >
        加载中...
      </div>
    );
  }

  if (showGrowth) {
    // Growth overlay mode
    const hasData = Object.keys(allHwData).length > 0;
    if (!hasData) return null;

    const classAvg = Object.values(allHwData)[0].class_avg;
    const chartData = AXES.map((axis) => {
      const entry: Record<string, string | number> = { dimension: axis.label };
      for (const hw of HW_TABS) {
        if (allHwData[hw]) {
          entry[`hw_${hw}`] = allHwData[hw].scores[axis.key] ?? 0;
        }
      }
      entry.classAvg = classAvg[axis.key] ?? 0;
      return entry;
    });

    return (
      <div
        style={{
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--gold-primary)", fontFamily: "var(--font-chinese)" }}>
            📈 成长轨迹 — 多作业叠加对比
          </span>
          <button
            onClick={() => setShowGrowth(false)}
            style={{
              padding: "4px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "var(--font-chinese)",
            }}
          >
            返回单次查看
          </button>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <RechartsRadar data={chartData} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <PolarGrid stroke="var(--border-subtle)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fill: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-chinese)" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <Radar
              name="班级均值"
              dataKey="classAvg"
              stroke="var(--chart-class-avg-stroke)"
              fill="var(--chart-class-avg-fill)"
              strokeWidth={1}
              strokeDasharray="5 5"
            />
            {HW_TABS.map((hw) =>
              allHwData[hw] ? (
                <Radar
                  key={hw}
                  name={hw}
                  dataKey={`hw_${hw}`}
                  stroke={HW_COLORS[hw].stroke}
                  fill={HW_COLORS[hw].fill}
                  strokeWidth={2}
                />
              ) : null
            )}
            <Legend
              wrapperStyle={{ fontSize: "13px", fontFamily: "var(--font-chinese)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: 13,
              }}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      </div>
    );
  }

  // Single HW mode
  if (!data) return null;

  const chartData = AXES.map((axis) => ({
    dimension: axis.label,
    student: data.scores[axis.key] ?? 0,
    classAvg: data.class_avg[axis.key] ?? 0,
  }));

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {/* HW tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "16px" }}>
          {HW_TABS.map((hw) => (
            <button
              key={hw}
              role="tab"
              aria-selected={activeHW === hw}
              onClick={() => setActiveHW(hw)}
              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: activeHW === hw ? 600 : 400,
                fontFamily: "var(--font-body)",
                color: activeHW === hw ? "var(--gold-primary)" : "var(--text-tertiary)",
                borderBottom:
                  activeHW === hw
                    ? "2px solid var(--gold-primary)"
                    : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
            >
              {hw}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowGrowth(true)}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--gold-dim)",
            background: "transparent",
            color: "var(--gold-primary)",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "var(--font-chinese)",
            marginBottom: "16px",
          }}
        >
          📈 成长轨迹
        </button>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <RechartsRadar
          data={chartData}
          margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
        >
          <PolarGrid stroke="var(--border-subtle)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "var(--text-secondary)", fontSize: 13, fontFamily: "var(--font-chinese)" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          />
          <Radar
            name="班级均值"
            dataKey="classAvg"
            stroke="var(--chart-class-avg-stroke)"
            fill="var(--chart-class-avg-fill)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
          <Radar
            name="我的成绩"
            dataKey="student"
            stroke="var(--chart-student-stroke)"
            fill="var(--chart-student-fill)"
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          />
        </RechartsRadar>
      </ResponsiveContainer>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          marginTop: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--chart-student-stroke)",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            我的成绩
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "var(--chart-class-avg-stroke)",
            }}
          />
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            班级均值
          </span>
        </div>
      </div>
    </div>
  );
}
