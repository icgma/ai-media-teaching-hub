"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardLoadingSkeleton from "./DashboardLoadingSkeleton";
import { fetchWithAuth } from "@/lib/api";

const HW_TABS = ["HW1", "HW2", "HW3"];

interface HistogramBin {
  bin: string;
  count: number;
}

interface BoxplotData {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

interface ScoresResponse {
  histogram: HistogramBin[];
  boxplot: BoxplotData;
}

function HWTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (hw: string) => void;
}) {
  return (
    <div role="tablist" style={{ display: "flex", gap: "0", marginBottom: "16px" }}>
      {HW_TABS.map((hw) => (
        <button
          key={hw}
          role="tab"
          aria-selected={active === hw}
          onClick={() => onChange(hw)}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: active === hw ? 600 : 400,
            fontFamily: "var(--font-body)",
            color: active === hw ? "var(--gold-primary)" : "var(--text-tertiary)",
            borderBottom:
              active === hw
                ? "2px solid var(--gold-primary)"
                : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          {hw}
        </button>
      ))}
    </div>
  );
}

function BoxPlotOverlay({ data, xMax }: { data: BoxplotData; xMax: number }) {
  const scale = (v: number) => (v / xMax) * 100;
  return (
    <div
      style={{
        position: "relative",
        height: "48px",
        marginTop: "12px",
        marginLeft: "16px",
        marginRight: "16px",
      }}
    >
      {/* Whisker line */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: `${scale(data.min)}%`,
          width: `${scale(data.max) - scale(data.min)}%`,
          height: "2px",
          background: "var(--text-secondary)",
          transform: "translateY(-50%)",
        }}
      />
      {/* Box */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: `${scale(data.q1)}%`,
          width: `${scale(data.q3) - scale(data.q1)}%`,
          height: "50%",
          border: "1.5px solid var(--text-secondary)",
          borderRadius: "3px",
          background: "var(--boxplot-box-bg)",
        }}
      />
      {/* Median line */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: `${scale(data.median)}%`,
          width: "2px",
          height: "50%",
          background: "var(--gold-primary)",
        }}
      />
      {/* Labels */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: `${scale(data.min)}%`,
          transform: "translateX(-50%)",
          fontSize: "11px",
          color: "var(--text-tertiary)",
        }}
      >
        {data.min}
      </span>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: `${scale(data.median)}%`,
          transform: "translateX(-50%)",
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--gold-primary)",
        }}
      >
        {data.median}
      </span>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: `${scale(data.max)}%`,
          transform: "translateX(-50%)",
          fontSize: "11px",
          color: "var(--text-tertiary)",
        }}
      >
        {data.max}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: "-2px",
          left: `${scale(data.q1)}%`,
          transform: "translateX(-50%)",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        Q1:{data.q1}
      </span>
      <span
        style={{
          position: "absolute",
          bottom: "-2px",
          left: `${scale(data.q3)}%`,
          transform: "translateX(-50%)",
          fontSize: "10px",
          color: "var(--text-muted)",
        }}
      >
        Q3:{data.q3}
      </span>
    </div>
  );
}

export default function ScoreDistributionChart({ token }: { token: string }) {
  const [activeHW, setActiveHW] = useState("HW1");
  const [data, setData] = useState<Record<string, ScoresResponse> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth("/api/dashboard/scores", token)
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
  if (!data || !data[activeHW]) return null;

  const hwData = data[activeHW];

  return (
    <div
      role="img"
      aria-label={`${activeHW} 作业成绩分布直方图与箱线图`}
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <p style={{ fontSize: "15px", fontFamily: "var(--font-chinese)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
            作业成绩分布
          </p>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            Histogram + Box Plot
          </p>
        </div>
      </div>

      <HWTabs active={activeHW} onChange={setActiveHW} />

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={hwData.histogram}
          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
        >
          <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis
            dataKey="bin"
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border-subtle)" }}
          />
          <YAxis
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border-subtle)" }}
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
          <Bar dataKey="count" fill="var(--chart-bar-fill)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <BoxPlotOverlay data={hwData.boxplot} xMax={100} />
    </div>
  );
}
