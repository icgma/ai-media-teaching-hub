const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface WeakPoint {
  hw_id: string;
  dimension: string;
  avg_score: number;
  max_score: number;
  gap: number;
  count: number;
  zero_count: number;
}

export interface WeakPointsResponse {
  summary: string;
  weak_points: WeakPoint[];
}

export async function getWeakPoints(token: string): Promise<WeakPointsResponse> {
  const res = await fetch(`${API_URL}/api/diagnosis/weak-points`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch weak points");
  return res.json();
}

export async function streamDiagnosis(
  hwId: string,
  token: string,
  onToken: (token: string) => void
): Promise<void> {
  const response = await fetch(`${API_URL}/api/diagnosis/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ hw: hwId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Diagnosis failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No reader available");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onToken(parsed.content);
          }
        } catch (e) {
          console.error("Error parsing SSE data", e, data);
        }
      }
    }
  }

  // Flush remaining buffer after stream ends
  if (buffer.trim()) {
    const remaining = buffer.trim();
    if (remaining.startsWith("data: ")) {
      const data = remaining.slice(6).trim();
      if (data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onToken(parsed.content);
          }
        } catch (e) {
          console.error("Error parsing final SSE data", e, data);
        }
      }
    }
  }
}
