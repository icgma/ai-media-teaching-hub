const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Stream chat completion via SSE from the backend.
 * Calls onChunk with each text fragment as it arrives.
 */
export async function streamChat(
  messages: { role: string; content: string }[],
  token: string,
  role: "teacher" | "student",
  onChunk: (text: string) => void,
  systemPrompt?: string,
): Promise<void> {
  const endpoint = role === "teacher" ? "/api/chat/teacher" : "/api/chat/student";

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages,
      system_prompt: systemPrompt,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Chat failed (${res.status})`);
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
          if (parsed.content) onChunk(parsed.content);
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}
