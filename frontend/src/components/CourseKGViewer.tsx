"use client";

import { forwardRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const CourseKGViewer = forwardRef<HTMLIFrameElement>(function CourseKGViewer(_props, ref) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "24px 24px 0 24px" }}>
        <p style={{ fontSize: "15px", fontFamily: "var(--font-chinese)", fontWeight: 500, color: "var(--text-primary)", marginBottom: "2px" }}>
          课程知识图谱
        </p>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
          Interactive Network Graph
        </p>
      </div>
      <iframe
        ref={ref}
        src={`${API_URL}/static/course-kg/index.html`}
        title="课程知识图谱"
        style={{
          width: "100%",
          height: "520px",
          border: "none",
          borderRadius: "var(--radius-md)",
          display: "block",
        }}
      />
    </div>
  );
});

export default CourseKGViewer;
