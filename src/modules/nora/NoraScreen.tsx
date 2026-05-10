import React, { useState, useEffect, useRef } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { ai } from "../../core/ai";
import { bus } from "../../core/events";
import { saveData, loadData } from "../../core/firebase";
import { Card, Spinner } from "../../shared/components";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  extracted?: string[]; // extracted tasks
}

const PROMPTS = [
  "What should I focus on today?",
  "I'm feeling overwhelmed",
  "Plan my week for me",
  "What's on my plate this week?",
];

export function NoraScreen() {
  const { user, profile } = useStore();
  const [msgs, setMsgs]     = useState<Message[]>([]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const name = profile?.name || "lovely";

  useEffect(() => {
    // Load session messages
    try {
      const saved = sessionStorage.getItem("hn_v2_nora_msgs");
      if (saved) setMsgs(JSON.parse(saved));
      else setMsgs([{
        role: "assistant",
        content: `Hello${profile?.name ? `, ${profile.name}` : ""}. I'm Nora, your AI chief of staff.\n\nTalk to me naturally — tell me what's on your mind and I'll help organise everything for you.`,
        timestamp: Date.now(),
      }]);
    } catch { }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    try { sessionStorage.setItem("hn_v2_nora_msgs", JSON.stringify(msgs.slice(-30))); } catch { }
  }, [msgs]);

  const send = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: prompt, timestamp: Date.now() };
    setMsgs(p => [...p, userMsg]);
    setLoading(true);

    const profileCtx = profile ? `Name: ${profile.name}. Challenge: ${profile.challenge}. Kids: ${profile.kids.map(k => k.name).join(", ") || "none"}.` : "";
    const history = msgs.slice(-8).map(m => ({ role: m.role, content: m.content }));

    const sys = `You are Nora, a warm intelligent AI Mental Load Manager inside HerNest. ${profileCtx}
Be concise, warm, and practical. Use the user's name occasionally. 
If they mention tasks, extract them and list them clearly.
Never lecture. Never judge. Always validate first.
If they seem overwhelmed, lead with empathy before solutions.`;

    const result = await ai(sys, prompt, "nora_chat", history);

    if (result.error) {
      setMsgs(p => [...p, { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment.", timestamp: Date.now() }]);
    } else {
      const assistantMsg: Message = { role: "assistant", content: result.text, timestamp: Date.now() };
      setMsgs(p => [...p, assistantMsg]);

      // Publish conversation event
      if (user?.uid) {
        await bus.publish("nora.conversation.ended", { messages: [...msgs, userMsg, assistantMsg] }, { userId: user.uid, source: "nora" });
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 90px)" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${T.esp} 0%, #3D2E22 100%)`, borderRadius: 22, padding: "18px 20px", marginBottom: 12, boxShadow: "0 24px 48px -24px rgba(42,31,24,.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, #8B6914)`, display: "flex", alignItems: "center", justifyContent: "center", animation: "breathe 3s ease-in-out infinite", boxShadow: `0 0 20px rgba(201,169,97,.4)`, flexShrink: 0 }}>
            <span style={{ fontSize: 20 }}>✦</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: F.serif, fontSize: 20, fontWeight: 600, color: "#fff", margin: 0, fontStyle: "italic" }}>Nora</h2>
            <p style={{ fontFamily: F.sans, fontSize: 11, color: "rgba(255,255,255,.4)", margin: 0, letterSpacing: 1.5, textTransform: "uppercase" }}>Mental Load Manager</p>
          </div>
          <button onClick={() => { setMsgs([{ role: "assistant", content: `Fresh start 💛 What's on your mind, ${name}?`, timestamp: Date.now() }]); sessionStorage.removeItem("hn_v2_nora_msgs"); }} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 10, padding: "5px 10px", fontFamily: F.sans, fontSize: 10, color: "rgba(255,255,255,.5)", cursor: "pointer" }}>
            Clear
          </button>
        </div>
      </div>

      {/* Prompt chips */}
      {msgs.length <= 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 12 }}>
          {PROMPTS.map((p, i) => (
            <button key={i} onClick={() => send(p)} style={{ background: T.ivory, border: `1px solid ${T.linen}`, borderRadius: 20, padding: "7px 14px", fontFamily: F.sans, fontSize: 12, color: T.bark, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12, animation: "fadeUp .3s ease both" }}>
            {m.role === "assistant" && (
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, marginRight: 8, background: `linear-gradient(135deg, ${T.gold}, #8B6914)`, display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-end" }}>
                <span style={{ fontSize: 12 }}>✦</span>
              </div>
            )}
            <div style={{ maxWidth: "82%", background: m.role === "user" ? `linear-gradient(135deg, ${T.esp}, #4a3020)` : "#fff", borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px", padding: "12px 16px", boxShadow: "0 2px 12px rgba(0,0,0,.08)", border: m.role === "assistant" ? `1px solid ${T.linen}` : "none" }}>
              {m.content.split("\n").filter(l => l.trim()).map((line, j) => (
                <p key={j} style={{ margin: "0 0 5px", lineHeight: 1.65, fontSize: 13, fontFamily: F.sans, color: m.role === "user" ? "rgba(255,255,255,.9)" : T.esp }}>{line}</p>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, #8B6914)`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 12 }}>✦</span></div>
            <div style={{ background: "#fff", borderRadius: "20px 20px 20px 4px", padding: "12px 16px", border: `1px solid ${T.linen}` }}>
              <Spinner size={16} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${T.linen}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Talk to Nora...`}
          maxLength={2000}
          style={{ flex: 1, background: T.ivory, border: `1.5px solid ${T.linen}`, borderRadius: 14, padding: "11px 14px", fontFamily: F.sans, fontSize: 14, color: T.esp, outline: "none" }}
        />
        <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 44, height: 44, borderRadius: 14, background: input.trim() && !loading ? T.esp : T.linen, border: "none", color: "#fff", fontSize: 18, cursor: input.trim() && !loading ? "pointer" : "not-allowed", flexShrink: 0, transition: "all .2s" }}>
          →
        </button>
      </div>
    </div>
  );
}
