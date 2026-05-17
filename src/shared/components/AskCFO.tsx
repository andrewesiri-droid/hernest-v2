// ─── AskCFO — Shared Household Decision Component ────────────────
// Drop into any screen for scenario planning.
// Updated: full HerNestCFOResponse, follow-up questions, next steps, compliance

import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { analyzeScenario, buildHouseholdSnapshot, COMPLIANCE_DISCLAIMER } from "../../core/household";
import { Spinner } from "./index";
import type { HerNestCFOResponse, ScenarioRecord } from "../../core/household/DecisionEngine";

interface AskCFOButtonProps {
  context?: "calendar" | "trips" | "family" | "general";
  prefill?: string;
  compact?: boolean;
  onResult?: (result: HerNestCFOResponse) => void;
}

const CONTEXT_PROMPTS: Record<string, string[]> = {
  calendar: [
    "Can we afford this busy month?",
    "What's the financial impact of this schedule?",
    "Should we cut back anywhere this month?",
  ],
  trips: [
    "Can we afford this trip?",
    "How does this trip affect our savings goals?",
    "Should we delay or book now?",
  ],
  family: [
    "Can we afford to hire help?",
    "What if school fees increase?",
    "Can we handle a major family event?",
  ],
  general: [
    "Are we in good financial shape?",
    "What should we prioritize right now?",
    "Can we handle an unexpected expense?",
  ],
};

const riskColor = (level: string) => {
  const map: Record<string, string> = { low: T.sage, medium: T.gold, high: T.blush };
  return map[level] || T.taupe;
};

const confidenceBadge = (c: string) => {
  const map: Record<string, string> = { high: T.sage, medium: T.gold, low: T.blush };
  return map[c] || T.taupe;
};

export function AskCFOButton({ context = "general", prefill, compact = false, onResult }: AskCFOButtonProps) {
  const { user, profile, householdSnapshot, setHouseholdSnapshot } = useStore();
  const [open, setOpen] = useState(!compact);
  const [question, setQuestion] = useState(prefill || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HerNestCFOResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "steps" | "options">("summary");

  const prompts = CONTEXT_PROMPTS[context] || CONTEXT_PROMPTS.general;

  const run = async (q?: string) => {
    const finalQ = (q || question).trim();
    if (!finalQ || loading || !user?.uid) return;
    setLoading(true);
    setResult(null);
    setActiveTab("summary");

    try {
      let snap = householdSnapshot;
      if (!snap) {
        snap = await buildHouseholdSnapshot(user.uid);
        setHouseholdSnapshot(snap);
      }
      const { result: res } = await analyzeScenario(finalQ, snap, user.uid, profile?.name);
      setResult(res);
      if (onResult) onResult(res);
    } catch (e) {
      console.error("[AskCFO] failed:", e);
    }
    setLoading(false);
  };

  // ── Compact chip (closed state) ───────────────────────────────
  if (compact && !open) {
    return (
      <button onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: `${T.esp}08`, border: `1px solid ${T.esp}20`, borderRadius: 20, fontFamily: F.sans, fontSize: 12, color: T.esp, cursor: "pointer", fontWeight: 600 }}>
        ✦ Ask CFO
      </button>
    );
  }

  return (
    <div style={{ background: T.ivory, border: `1px solid ${T.linen}`, borderRadius: 18, padding: "14px 16px", marginTop: 12 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <p style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 2px" }}>HOUSEHOLD CFO</p>
          <p style={{ fontFamily: F.sans, fontSize: 12, color: T.esp, margin: 0 }}>Ask a financial "what if"</p>
        </div>
        {compact && (
          <button onClick={() => { setOpen(false); setResult(null); }}
            style={{ background: "none", border: "none", color: T.taupe, cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
        )}
      </div>

      {/* Input state */}
      {!result && !loading && (
        <>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 10, paddingBottom: 2, scrollbarWidth: "none" }}>
            {prompts.map((p, i) => (
              <button key={i} onClick={() => run(p)}
                style={{ padding: "6px 12px", borderRadius: 16, border: `1px solid ${T.linen}`, background: "#fff", fontFamily: F.sans, fontSize: 11, color: T.esp, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={question} onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && run()}
              placeholder="Ask your own what-if..."
              style={{ flex: 1, background: T.sand, border: `1.5px solid ${T.linen}`, borderRadius: 12, padding: "10px 12px", fontFamily: F.sans, fontSize: 13, color: T.esp, outline: "none" }} />
            <button onClick={() => run()} disabled={!question.trim()}
              style={{ width: 40, height: 40, borderRadius: 12, background: question.trim() ? T.esp : T.linen, border: "none", color: "#fff", fontSize: 16, cursor: question.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>
              →
            </button>
          </div>
        </>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}>
          <Spinner size={16} />
          <p style={{ fontFamily: F.sans, fontSize: 12, color: T.taupe, margin: 0 }}>Analyzing your household finances...</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div>
          {/* Risk + confidence row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ padding: "3px 10px", borderRadius: 8, background: `${riskColor(result.riskLevel)}15` }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, color: riskColor(result.riskLevel), textTransform: "uppercase" }}>
                {result.riskLevel} risk
              </span>
            </div>
            <div style={{ padding: "3px 10px", borderRadius: 8, background: `${confidenceBadge(result.confidence)}15` }}>
              <span style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, color: confidenceBadge(result.confidence), textTransform: "uppercase" }}>
                {result.confidence} confidence · {result.confidenceLevel}%
              </span>
            </div>
          </div>

          {/* Summary */}
          <p style={{ fontFamily: F.sans, fontSize: 13, color: T.esp, margin: "0 0 12px", lineHeight: 1.6, fontWeight: 600 }}>
            {result.summary}
          </p>

          {/* Tab nav */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {(["summary", "steps", "options"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding: "5px 12px", borderRadius: 12, border: `1px solid ${activeTab === t ? T.esp : T.linen}`, background: activeTab === t ? T.esp : "#fff", fontFamily: F.sans, fontSize: 11, color: activeTab === t ? "#fff" : T.taupe, cursor: "pointer", fontWeight: activeTab === t ? 700 : 400, textTransform: "capitalize" }}>
                {t === "summary" ? "Analysis" : t === "steps" ? "Next Steps" : "Options"}
              </button>
            ))}
          </div>

          {/* Tab: Summary */}
          {activeTab === "summary" && (
            <div>
              <p style={{ fontFamily: F.sans, fontSize: 12, color: T.esp, margin: "0 0 8px", lineHeight: 1.6 }}>
                <strong>Observation:</strong> {result.observation}
              </p>
              <p style={{ fontFamily: F.sans, fontSize: 12, color: T.bark, margin: "0 0 8px", lineHeight: 1.6 }}>
                <strong>Why it matters:</strong> {result.whyItMatters}
              </p>
              <p style={{ fontFamily: F.sans, fontSize: 12, color: T.esp, margin: "0 0 8px", lineHeight: 1.6 }}>
                <strong>Financial impact:</strong> {result.financialImpact}
              </p>
              {result.tradeoffs.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, color: T.taupe, margin: "0 0 4px" }}>TRADEOFFS</p>
                  {result.tradeoffs.map((t, i) => (
                    <p key={i} style={{ fontFamily: F.sans, fontSize: 12, color: T.bark, margin: "0 0 3px", paddingLeft: 10, borderLeft: `2px solid ${T.linen}`, lineHeight: 1.5 }}>{t}</p>
                  ))}
                </div>
              )}
              {result.assumptions.length > 0 && (
                <div style={{ padding: "8px 10px", background: T.sand, borderRadius: 8, marginBottom: 8 }}>
                  <p style={{ fontFamily: F.sans, fontSize: 10, color: T.taupe, margin: "0 0 4px", fontWeight: 700 }}>ASSUMPTIONS</p>
                  {result.assumptions.map((a, i) => (
                    <p key={i} style={{ fontFamily: F.sans, fontSize: 11, color: T.bark, margin: "0 0 2px" }}>· {a}</p>
                  ))}
                </div>
              )}
              {/* Recommendation */}
              <div style={{ padding: "10px 12px", background: `${T.esp}08`, borderRadius: 10, borderLeft: `3px solid ${T.esp}` }}>
                <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, color: T.taupe, margin: "0 0 4px" }}>RECOMMENDATION</p>
                <p style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.esp, margin: 0, lineHeight: 1.5 }}>
                  ✦ {result.recommendedAction}
                </p>
              </div>
            </div>
          )}

          {/* Tab: Next Steps */}
          {activeTab === "steps" && (
            <div>
              {result.nextSteps.length > 0 ? result.nextSteps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${T.linen}` }}>
                  <span style={{ fontFamily: F.sans, fontSize: 11, color: T.gold, fontWeight: 700, flexShrink: 0, width: 18 }}>{i + 1}.</span>
                  <p style={{ fontFamily: F.sans, fontSize: 13, color: T.esp, margin: 0, lineHeight: 1.5 }}>{step}</p>
                </div>
              )) : (
                <p style={{ fontFamily: F.sans, fontSize: 13, color: T.taupe, fontStyle: "italic" }}>No specific steps generated.</p>
              )}
            </div>
          )}

          {/* Tab: Options */}
          {activeTab === "options" && (
            <div>
              {result.options.length > 0 ? result.options.map((opt, i) => (
                <div key={i} style={{ padding: "10px 12px", background: "#fff", borderRadius: 10, border: `1px solid ${T.linen}`, marginBottom: 6 }}>
                  <p style={{ fontFamily: F.sans, fontSize: 12, color: T.esp, margin: 0, lineHeight: 1.5 }}>
                    <strong style={{ color: T.gold }}>Option {i + 1}:</strong> {opt}
                  </p>
                </div>
              )) : (
                <p style={{ fontFamily: F.sans, fontSize: 13, color: T.taupe, fontStyle: "italic" }}>No options generated.</p>
              )}
            </div>
          )}

          {/* Follow-up questions */}
          {result.suggestedFollowUpQuestions?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, color: T.taupe, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>ASK A FOLLOW-UP</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {result.suggestedFollowUpQuestions.map((q, i) => (
                  <button key={i} onClick={() => { setResult(null); setQuestion(q); run(q); }}
                    style={{ textAlign: "left", padding: "8px 12px", background: T.sand, border: `1px solid ${T.linen}`, borderRadius: 10, fontFamily: F.sans, fontSize: 12, color: T.esp, cursor: "pointer", lineHeight: 1.4 }}>
                    {q} →
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Compliance + actions */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontFamily: F.sans, fontSize: 10, color: T.taupe, margin: "0 0 10px", lineHeight: 1.5, fontStyle: "italic" }}>
              {COMPLIANCE_DISCLAIMER}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setResult(null); setQuestion(""); }}
                style={{ flex: 1, padding: "8px", background: "none", border: `1px solid ${T.linen}`, borderRadius: 10, fontFamily: F.sans, fontSize: 12, color: T.taupe, cursor: "pointer" }}>
                New question
              </button>
              <button onClick={() => useStore.getState().setActiveTab("budget")}
                style={{ flex: 1, padding: "8px", background: T.esp, border: "none", borderRadius: 10, fontFamily: F.sans, fontSize: 12, color: "#fff", cursor: "pointer", fontWeight: 600 }}>
                Open CFO →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
