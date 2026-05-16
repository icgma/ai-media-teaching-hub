"use client";

interface DashboardLoadingSkeletonProps {
  variant?: "wide" | "square";
  count?: number;
}

export default function DashboardLoadingSkeleton({
  variant = "square",
  count = 1,
}: DashboardLoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background:
              "linear-gradient(90deg, var(--bg-hover) 25%, var(--bg-elevated) 50%, var(--bg-hover) 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            aspectRatio: variant === "square" ? "4/3" : undefined,
            height: variant === "wide" ? "520px" : undefined,
            width: "100%",
          }}
        />
      ))}
    </>
  );
}
