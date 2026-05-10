import React, { useEffect, useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, HeroCard, PageTitle, NoraCallout } from "../../shared/components";
import { loadData } from "../../core/firebase";

export function HomeScreen() {
  const { profile, user } = useStore();
  const [tasks, setTasks] = useState<any[]>([]);
  const [context, setContext] = useState<any>(null);

  const name = profile?.name || "lovely";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    if (!user?.uid) return;
    loadData(user.uid, "tasks").then(d => { if (d?.tasks) setTasks((d.tasks as any[]).slice(0, 3)); });
  }, [user?.uid]);

  return (
    <div style={{ animation: "fadeUp .45s ease both" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <p style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: T.taupe, margin: "0 0 8px" }}>{date}</p>
        <h1 style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 34, color: T.esp, margin: 0, fontWeight: 500, lineHeight: 1.1 }}>
          {greeting},<br />{name}.
        </h1>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Tasks", value: tasks.length, icon: "☐" },
          { label: "Focus", value: "Today", icon: "◎" },
          { label: "Nora", value: "Ready", icon: "✦" },
        ].map((s, i) => (
          <div key={i} style={{ background: T.ivory, borderRadius: 16, padding: "14px 12px", border: `1px solid ${T.linen}`, textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: T.esp }}>{s.value}</div>
            <div style={{ fontFamily: F.sans, fontSize: 10, color: T.taupe, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <NoraCallout message={`Welcome back${name !== "lovely" ? `, ${name}` : ""}. Your briefing is ready — tap Briefing in the nav to see today's priorities.`} />

      {/* Today's tasks */}
      {tasks.length > 0 && (
        <Card>
          <p style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 12px" }}>TODAY'S TASKS</p>
          {tasks.map((t: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < tasks.length-1 ? `1px solid ${T.linen}` : "none" }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${T.linen}`, flexShrink: 0 }} />
              <span style={{ fontFamily: F.sans, fontSize: 13, color: T.esp }}>{t.text || t.title}</span>
            </div>
          ))}
        </Card>
      )}

      {/* Quick actions */}
      <p style={{ fontFamily: F.sans, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "16px 0 10px" }}>QUICK ACCESS</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Chat with Nora", icon: "✦", tab: "nora", color: T.esp },
          { label: "Morning Briefing", icon: "☀", tab: "briefing", color: T.gold },
          { label: "Log Expense",   icon: "💰", tab: "budget", color: T.sage },
          { label: "Plan My Week",  icon: "📅", tab: "plan",   color: T.sky },
        ].map((a, i) => (
          <div key={i} onClick={() => useStore.getState().setActiveTab(a.tab)} style={{ background: T.ivory, border: `1px solid ${T.linen}`, borderRadius: 16, padding: "16px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{a.icon}</div>
            <span style={{ fontFamily: F.sans, fontSize: 12, fontWeight: 600, color: T.esp }}>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
