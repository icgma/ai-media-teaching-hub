"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import RAGPanel from "@/components/RAGPanel";
import ScoreDistributionChart from "@/components/ScoreDistributionChart";
import KnowledgeHeatmap from "@/components/KnowledgeHeatmap";
import CourseKGViewer from "@/components/CourseKGViewer";
import ActivitySummaryCards from "@/components/ActivitySummaryCards";
import WeakPointSummary from "@/components/WeakPointSummary";
import DiagnosisPanel from "@/components/DiagnosisPanel";
import { ThemeToggle } from "@/components/ThemeToggle";

const tabs = [
  { id: "dashboard", label: "教研驾驶舱", icon: "◈" },
  { id: "rag", label: "智能备课", icon: "⟁" },
  { id: "insight", label: "学情诊断", icon: "◎" },
];

export default function TeacherPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const kgIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "teacher") router.push("/");
    setTimeout(() => {
      setToken(localStorage.getItem("token") || "");
      setMounted(true);
    }, 0);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    router.push("/");
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)" }}>
      {/* Navigation bar */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--border)",
          background: "var(--nav-background)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 32px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontFamily: "var(--font-chinese)",
                fontSize: "17px",
                fontWeight: 600,
                color: "var(--gold-primary)",
                letterSpacing: "0.08em",
              }}
            >
              传媒AI智能中枢
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--gold-dim)",
                letterSpacing: "0.1em",
              }}
            >
              INSTRUCTOR
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <ThemeToggle />
            <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-body)",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
          >
            退出 ↗
          </button>
          </div>
        </div>
      </nav>

      {/* Tab bar — editorial style with bottom border indicator */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 32px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", gap: "0" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              data-tab={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                position: "relative",
                padding: "20px 28px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontFamily: "var(--font-chinese)",
                color: activeTab === tab.id ? "var(--gold-primary)" : "var(--text-tertiary)",
                letterSpacing: "0.05em",
                transition: "all 0.3s ease",
                borderBottom: activeTab === tab.id
                  ? "2px solid var(--gold-primary)"
                  : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) e.currentTarget.style.color = "var(--text-tertiary)";
              }}
            >
              <span style={{ marginRight: "8px", opacity: 0.6 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px",
          animation: "fadeIn 0.5s ease-out",
        }}
      >
        {activeTab === "dashboard" && (
          <div>
            <ActivitySummaryCards token={token} />
            {/* Section header */}
            <div style={{ marginBottom: "32px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-dim)",
                  marginBottom: "8px",
                }}
              >
                Overview
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-chinese)",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                教研数据总览
              </h2>
            </div>

            {/* Score Distribution + Knowledge Heatmap — 2-column grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <ScoreDistributionChart token={token} />
              <KnowledgeHeatmap token={token} kgIframeRef={kgIframeRef} />
            </div>

            {/* Course KG Viewer — full width */}
            <CourseKGViewer ref={kgIframeRef} />
          </div>
        )}

        {activeTab === "rag" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-dim)",
                  marginBottom: "8px",
                }}
              >
                Retrieval-Augmented Generation
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-chinese)",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                RAG 智能备课
              </h2>
            </div>
            <RAGPanel
              title="基于 16 周课程资料的检索增强教案生成"
              placeholder="例如：请结合第11周课件，生成一份关于Deepfake伦理的课堂讨论题..."
              userRole="teacher"
            />
          </div>
        )}

        {activeTab === "insight" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--gold-dim)",
                  marginBottom: "8px",
                }}
              >
                Learning Diagnosis
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-chinese)",
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                学情归因诊断
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", alignItems: "start" }}>
              <WeakPointSummary />
              <DiagnosisPanel />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
