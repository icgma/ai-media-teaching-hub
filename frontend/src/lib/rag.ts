const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface Citation {
  week: string;
  filename: string;
  doc_type: string;
  relevance: number;
}

/**
 * Stream RAG chat via SSE. First event contains citations, then text chunks.
 */
export async function streamRAG(
  question: string,
  token: string,
  role: "teacher" | "student",
  onChunk: (text: string) => void,
  onCitations?: (citations: Citation[]) => void,
  topK: number = 5,
): Promise<void> {
  const endpoint = role === "teacher" ? "/api/rag/teacher" : "/api/rag/student";

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, top_k: topK }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `RAG query failed (${res.status})`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

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
          if (parsed.citations && onCitations) {
            onCitations(parsed.citations);
          } else if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          // skip malformed
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
          if (parsed.citations && onCitations) {
            onCitations(parsed.citations);
          } else if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          // skip malformed
        }
      }
    }
  }
}
