"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import RAGPanel from "@/components/RAGPanel";
import PromptCoachPanel from "@/components/PromptCoachPanel";
import StudentLookupForm from "@/components/StudentLookupForm";
import StudentRadarChart from "@/components/StudentRadarChart";
import { ThemeToggle } from "@/components/ThemeToggle";
import InterviewSimulator from "@/components/empowerment/InterviewSimulator";
import EthicsSandbox from "@/components/empowerment/EthicsSandbox";
import ReversePromptAnalyzer from "@/components/empowerment/ReversePromptAnalyzer";

const tabs = [
  { id: "qa", label: "课程问答", icon: "◈" },
  { id: "prompt", label: "提示词工坊", icon: "✦" },
  { id: "empower", label: "实训大厅", icon: "❖" },
  { id: "profile", label: "我的学情", icon: "◎" },
];

export default function StudentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("qa");
  const [empowerTab, setEmpowerTab] = useState("interview");
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const [lookupId, setLookupId] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (!role) router.push("/");
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

  const handleLookup = useCallback((studentId: string) => {
    setLookupId(studentId);
    setRadarError(null);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-deep)" }}>
      {/* Nav */}
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
                color: "var(--green-accent)",
                letterSpacing: "0.1em",
              }}
            >
              STUDENT
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
            }}
          >
            退出 ↗
          </button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 32px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
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
        {activeTab === "qa" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Course Q&A
              </p>
              <h2 style={{ fontFamily: "var(--font-chinese)", fontSize: "24px", fontWeight: 600, color: "var(--text-primary)" }}>
                课程 AI 问答
              </h2>
            </div>
            <RAGPanel
              title="基于 16 周课件的 RAG 智能答疑"
              placeholder="例如：什么是倒金字塔结构？CRISPE框架包含哪几个要素？"
              userRole="student"
            />
          </div>
        )}

        {activeTab === "prompt" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Prompt Workshop
              </p>
              <h2 style={{ fontFamily: "var(--font-chinese)", fontSize: "24px", fontWeight: 600, color: "var(--text-primary)" }}>
                提示词工坊
              </h2>
            </div>
            <PromptCoachPanel token={token} />
          </div>
        )}

        {activeTab === "empower" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Empowerment Hub
              </p>
              <h2 style={{ fontFamily: "var(--font-chinese)", fontSize: "24px", fontWeight: 600, color: "var(--text-primary)" }}>
                实训大厅
              </h2>
            </div>
            
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              {[
                { id: "interview", label: "沉浸式采访模拟" },
                { id: "sandbox", label: "伦理找茬沙盒" },
                { id: "reverse", label: "作品反向拆解" }
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setEmpowerTab(sub.id)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid",
                    borderColor: empowerTab === sub.id ? "var(--gold-dim)" : "var(--border)",
                    background: empowerTab === sub.id ? "rgba(212, 168, 83, 0.1)" : "transparent",
                    color: empowerTab === sub.id ? "var(--gold-primary)" : "var(--text-tertiary)",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {empowerTab === "interview" && <InterviewSimulator token={token} />}
            {empowerTab === "sandbox" && <EthicsSandbox token={token} />}
            {empowerTab === "reverse" && <ReversePromptAnalyzer token={token} />}
          </div>
        )}

        {activeTab === "profile" && (
          <div>
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: "8px" }}>
                Personal Analytics
              </p>
              <h2 style={{ fontFamily: "var(--font-chinese)", fontSize: "24px", fontWeight: 600, color: "var(--text-primary)" }}>
                我的学情报告
              </h2>
            </div>

            <StudentLookupForm
              onLookup={handleLookup}
              error={radarError}
            />

            {lookupId && (
              <div style={{ marginTop: "24px" }}>
                <StudentRadarChart
                  studentId={lookupId}
                  token={token}
                  onError={setRadarError}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
