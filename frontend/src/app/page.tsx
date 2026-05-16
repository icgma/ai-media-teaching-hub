"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"teacher" | "student">("student");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(password, role);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("role", res.role);
      router.push(res.role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: "24px",
      }}
    >
      {/* Decorative gold gradient orbs */}
      <ThemeToggle size="sm" style={{ position: "fixed", top: "16px", right: "16px", zIndex: 100 }} />
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "15%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-subtle) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          right: "10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--gold-subtle) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "440px",
          animation: "fadeInUp 0.8s ease-out",
        }}
      >
        {/* Vertical accent line */}
        <div
          style={{
            position: "absolute",
            top: "-40px",
            left: "50%",
            width: "1px",
            height: "32px",
            background: "linear-gradient(to bottom, transparent, var(--gold-primary))",
          }}
        />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--gold-primary)",
              marginBottom: "16px",
              animation: "fadeIn 1s ease-out 0.2s both",
            }}
          >
            AI-Powered Teaching Intelligence
          </p>
          <h1
            style={{
              fontFamily: "var(--font-chinese)",
              fontSize: "32px",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              letterSpacing: "0.05em",
              animation: "fadeIn 1s ease-out 0.3s both",
            }}
          >
            传媒AI教研
          </h1>
          <h1
            style={{
              fontFamily: "var(--font-chinese)",
              fontSize: "32px",
              fontWeight: 600,
              color: "var(--gold-primary)",
              lineHeight: 1.3,
              letterSpacing: "0.05em",
              animation: "fadeIn 1s ease-out 0.4s both",
            }}
          >
            智能中枢
          </h1>
          <div
            style={{
              width: "40px",
              height: "1px",
              background: "var(--gold-dim)",
              margin: "20px auto 12px",
              animation: "fadeIn 1s ease-out 0.5s both",
            }}
          />
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-tertiary)",
              fontFamily: "var(--font-chinese)",
              animation: "fadeIn 1s ease-out 0.6s both",
            }}
          >
            汕头大学长江新闻与传播学院
          </p>
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "0.08em",
              marginTop: "6px",
              animation: "fadeIn 1s ease-out 0.7s both",
            }}
          >
            用数据驱动精准教学
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "36px",
            boxShadow: "var(--shadow-card), var(--shadow-glow)",
            animation: "fadeInUp 0.8s ease-out 0.3s both",
          }}
        >
          {/* Role selector */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "28px",
              padding: "4px",
              background: "var(--bg-deep)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(["student", "teacher"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(""); }}
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: role === r ? 600 : 400,
                  fontFamily: "var(--font-chinese)",
                  transition: "all 0.3s ease",
                  background: role === r ? "var(--gold-subtle)" : "transparent",
                  color: role === r ? "var(--gold-primary)" : "var(--text-tertiary)",
                  borderBottom: role === r ? "2px solid var(--gold-primary)" : "2px solid transparent",
                }}
              >
                {r === "student" ? "🎓 学生入口" : "📐 教师入口"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                }}
              >
                {role === "teacher" ? "教师密码" : "课程访问码"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={role === "teacher" ? "请输入教师密码" : "请输入课程访问码"}
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "var(--bg-deep)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  fontFamily: "var(--font-body)",
                  outline: "none",
                  transition: "border-color 0.3s ease, box-shadow 0.3s ease",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--gold-dim)";
                  e.target.style.boxShadow = "0 0 0 3px var(--gold-glow)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  marginBottom: "16px",
                  background: "var(--error-bg)",
                  border: "1px solid var(--error-border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--red-accent)",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: 600,
                fontFamily: "var(--font-chinese)",
                letterSpacing: "0.1em",
                transition: "all 0.3s ease",
                background: loading
                  ? "var(--bg-hover)"
                  : "linear-gradient(135deg, var(--gold-dim) 0%, var(--gold-primary) 50%, var(--gold-light) 100%)",
                color: loading ? "var(--text-tertiary)" : "var(--bg-deep)",
                opacity: loading ? 0.6 : 1,
                boxShadow: loading ? "none" : "0 4px 20px var(--gold-cta-shadow)",
              }}
            >
              {loading ? "验证中..." : "进入系统"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
            animation: "fadeIn 1s ease-out 0.8s both",
          }}
        >
          <p
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              letterSpacing: "0.1em",
            }}
          >
            © 2025 · AI驱动的传媒内容制作
          </p>
        </div>
      </div>
    </div>
  );
}
