"use client";

import { useState } from "react";
import {
  streamPromptEvaluate,
  streamPromptImprove,
  getPracticeScenario,
} from "@/lib/promptCoach";

interface EvaluationScore {
  score: number;
  dimension: string;
  diagnosis: string;
}

interface EvaluationResult {
  scores: Record<string, EvaluationScore>;
  overall_diagnosis: string;
  total_score: number;
  grade: string;
}

function ScoreStars({ score }: { score: number }) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background:
              i < score ? "var(--gold-primary)" : "var(--border)",
            opacity: i < score ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

function gradeColor(grade: string) {
  if (grade === "优秀") return "var(--green-accent)";
  if (grade === "良好") return "var(--gold-primary)";
  if (grade === "及格") return "var(--text-secondary)";
  return "var(--text-tertiary)";
}

interface Props {
  token: string;
}

export default function PromptCoachPanel({ token }: Props) {
  const [inputPrompt, setInputPrompt] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [rawEvaluation, setRawEvaluation] = useState("");
  const [improvedPrompt, setImprovedPrompt] = useState("");
  const [practiceScenario, setPracticeScenario] = useState<{
    id: string;
    task: string;
    difficulty: string;
    category: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const handleEvaluate = async () => {
    if (!inputPrompt.trim()) return;
    setIsEvaluating(true);
    setEvaluation(null);
    setImprovedPrompt("");
    setStreamingText("");
    let fullResponse = "";

    await streamPromptEvaluate(inputPrompt, token, (chunk) => {
      fullResponse += chunk;
      setStreamingText(fullResponse);
    });

    // Final parse attempt
    try {
      const parsed = JSON.parse(fullResponse);
      if (parsed.scores) {
        setEvaluation(parsed);
        setRawEvaluation(fullResponse);
      }
    } catch {
      setEvaluation({
        scores: {},
        overall_diagnosis: fullResponse,
        total_score: 0,
        grade: "解析失败",
      });
    }

    setStreamingText("");
    setIsEvaluating(false);

    // Fetch practice scenario
    try {
      const scenario = await getPracticeScenario();
      setPracticeScenario(scenario);
    } catch {
      // practice scenario is optional
    }
  };

  const handleImprove = async () => {
    if (!rawEvaluation) return;
    setIsImproving(true);
    setImprovedPrompt("");
    setStreamingText("");
    let fullResponse = "";

    await streamPromptImprove(
      inputPrompt,
      rawEvaluation,
      token,
      (chunk) => {
        fullResponse += chunk;
        setStreamingText(fullResponse);
      },
    );

    setImprovedPrompt(fullResponse);
    setStreamingText("");
    setIsImproving(false);
  };

  const difficultyLabel = (d: string) => {
    if (d === "basic") return "基础";
    if (d === "intermediate") return "进阶";
    return "挑战";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Input */}
      <div
        style={{
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          padding: "24px",
        }}
      >
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "8px",
          }}
        >
          输入你的 Prompt
        </label>
        <textarea
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="例如：请帮我写一篇关于AI在新闻行业应用的报道..."
          rows={5}
          style={{
            width: "100%",
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "12px 16px",
            color: "var(--text-primary)",
            fontSize: "14px",
            fontFamily: "var(--font-chinese)",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleEvaluate}
            disabled={isEvaluating || !inputPrompt.trim()}
            style={{
              padding: "10px 24px",
              background:
                isEvaluating || !inputPrompt.trim()
                  ? "var(--border)"
                  : "var(--gold-primary)",
              color:
                isEvaluating || !inputPrompt.trim()
                  ? "var(--text-muted)"
                  : "var(--btn-cta-text)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              fontSize: "13px",
              fontWeight: 600,
              cursor:
                isEvaluating || !inputPrompt.trim()
                  ? "not-allowed"
                  : "pointer",
              fontFamily: "var(--font-chinese)",
            }}
          >
            {isEvaluating ? "评估中..." : "CRISPE 评估"}
          </button>
          {evaluation && !isImproving && (
            <button
              onClick={handleImprove}
              style={{
                padding: "10px 24px",
                background: "transparent",
                color: "var(--gold-primary)",
                border: "1px solid var(--gold-primary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-chinese)",
              }}
            >
              获取改进建议
            </button>
          )}
          {isImproving && (
            <span
              style={{
                fontSize: "13px",
                color: "var(--gold-dim)",
                fontFamily: "var(--font-chinese)",
              }}
            >
              正在生成改进建议...
            </span>
          )}
        </div>
      </div>

      {/* Streaming text (while loading) */}
      {streamingText && (
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            padding: "24px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-chinese)",
            whiteSpace: "pre-wrap",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {streamingText}
        </div>
      )}

      {/* Evaluation results */}
      {evaluation && !streamingText && (
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            padding: "24px",
          }}
        >
          {/* Summary bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-chinese)",
                }}
              >
                总分
              </span>
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {evaluation.total_score}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                }}
              >
                /25
              </span>
            </div>
            <span
              style={{
                padding: "4px 16px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${gradeColor(evaluation.grade)}`,
                fontSize: "13px",
                fontWeight: 600,
                color: gradeColor(evaluation.grade),
                fontFamily: "var(--font-chinese)",
              }}
            >
              {evaluation.grade}
            </span>
          </div>

          {/* Score table */}
          {Object.keys(evaluation.scores).length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                      fontFamily: "var(--font-chinese)",
                    }}
                  >
                    维度
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                    }}
                  >
                    评分
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: "var(--text-secondary)",
                      fontWeight: 500,
                      fontFamily: "var(--font-chinese)",
                    }}
                  >
                    诊断
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(evaluation.scores).map(([key, val]) => (
                  <tr
                    key={key}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        color: "var(--gold-primary)",
                        fontWeight: 600,
                        fontFamily: "var(--font-chinese)",
                      }}
                    >
                      {key} — {val.dimension}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <ScoreStars score={val.score} />
                        <span style={{ color: "var(--text-primary)" }}>
                          {val.score}/5
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-chinese)",
                        maxWidth: "400px",
                      }}
                    >
                      {val.diagnosis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Overall diagnosis */}
          {evaluation.overall_diagnosis && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-deep)",
                fontSize: "14px",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-chinese)",
                lineHeight: 1.7,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--gold-dim)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                总体诊断
              </span>
              {evaluation.overall_diagnosis}
            </div>
          )}
        </div>
      )}

      {/* Improved prompt */}
      {improvedPrompt && (
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            padding: "24px",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "var(--gold-dim)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "12px",
            }}
          >
            改进后的提示词
          </span>
          <div
            style={{
              padding: "16px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-deep)",
              fontSize: "14px",
              color: "var(--text-primary)",
              fontFamily: "var(--font-chinese)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {improvedPrompt}
          </div>
        </div>
      )}

      {/* Practice scenario */}
      {practiceScenario && (
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            padding: "24px",
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "var(--gold-dim)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "12px",
            }}
          >
            Practice Task
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: "11px",
                color: "var(--green-accent)",
                fontFamily: "var(--font-chinese)",
              }}
            >
              {practiceScenario.category}
            </span>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            >
              {difficultyLabel(practiceScenario.difficulty)}
            </span>
          </div>
          <p
            style={{
              marginTop: "12px",
              fontSize: "15px",
              color: "var(--text-primary)",
              fontFamily: "var(--font-chinese)",
              lineHeight: 1.6,
            }}
          >
            {practiceScenario.task}
          </p>
          <button
            onClick={() => {
              setInputPrompt("");
              setEvaluation(null);
              setImprovedPrompt("");
              setPracticeScenario(null);
            }}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              background: "transparent",
              color: "var(--gold-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "var(--font-chinese)",
            }}
          >
            试试这道题
          </button>
        </div>
      )}
    </div>
  );
}
