"use client";

import { useState, FormEvent } from "react";

interface StudentLookupFormProps {
  onLookup: (studentId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function StudentLookupForm({
  onLookup,
  loading = false,
  error = null,
}: StudentLookupFormProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onLookup(trimmed);
  }

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "24px",
      }}
    >
      <p
        style={{
          fontSize: "14px",
          fontFamily: "var(--font-chinese)",
          color: "var(--text-secondary)",
          marginBottom: "16px",
          lineHeight: 1.6,
        }}
      >
        输入您的匿名学号，查看个人学情分析
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          marginBottom: "16px",
        }}
      >
        学号由教师提供，格式为 S001、S002 等
      </p>
      <form
        onSubmit={handleSubmit}
        aria-busy={loading}
        style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}
      >
        <div style={{ flex: 1 }}>
          <label
            htmlFor="student-id-input"
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}
          >
            匿名学号
          </label>
          <input
            id="student-id-input"
            aria-label="匿名学号"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例如：S001"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              fontSize: "14px",
              fontFamily: "var(--font-body)",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--gold-primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          />
        </div>
        <button
          type="submit"
          style={{
            marginTop: "22px",
            padding: "10px 24px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--gold-primary)",
            background: "var(--gold-primary)",
            color: "var(--bg-deep)",
            fontSize: "14px",
            fontWeight: 600,
            fontFamily: "var(--font-chinese)",
            cursor: "pointer",
            transition: "all 0.2s",
            opacity: loading ? 0.6 : 1,
          }}
        >
          查询
        </button>
      </form>
      {error && (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--error-bg)",
            border: "1px solid var(--error-border)",
            fontSize: "13px",
            color: "var(--red-accent)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
