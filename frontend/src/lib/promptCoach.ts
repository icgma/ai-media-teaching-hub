const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function streamPromptEvaluate(
  prompt: string,
  token: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/prompt/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt }),
  });

  const reader = res.body?.getReader();
  if (!reader) return;

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

export async function streamPromptImprove(
  originalPrompt: string,
  evaluationJson: string,
  token: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/prompt/improve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      original_prompt: originalPrompt,
      evaluation_json: evaluationJson,
    }),
  });

  const reader = res.body?.getReader();
  if (!reader) return;

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

export async function getPracticeScenario(): Promise<{
  id: string;
  task: string;
  difficulty: string;
  category: string;
}> {
  const res = await fetch(`${API_URL}/api/prompt/practice`);
  if (!res.ok) throw new Error("Failed to fetch practice scenario");
  return res.json();
}
