import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, Button, Input, ProgressBar, AIBadge, Spinner } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { ai } from "../../core/ai";
import { bus } from "../../core/events";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────
interface Category {
  id: string;
  label: string;
  budget: number;
  spent: number;
  color: string;
  icon: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  merchant: string;
  note: string;
  date: string;
  method: "manual" | "receipt" | "csv";
}

interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  linkedTripId?: string;
  deadline?: string;
}

interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

const DEFAULT_CATS: Category[] = [
  { id: "groceries",     label: "Groceries",     budget: 700,  spent: 0, color: T.sage,  icon: "🛒" },
  { id: "kids",          label: "Kids",           budget: 400,  spent: 0, color: T.sky,   icon: "🧒" },
  { id: "fitness",       label: "Fitness",        budget: 120,  spent: 0, color: T.blush, icon: "💪" },
  { id: "dining",        label: "Dining",         budget: 300,  spent: 0, color: T.gold,  icon: "🍽" },
  { id: "shopping",      label: "Shopping",       budget: 500,  spent: 0, color: T.lav,   icon: "🛍" },
  { id: "transport",     label: "Transport",      budget: 200,  spent: 0, color: T.teal,  icon: "🚗" },
  { id: "health",        label: "Health",         budget: 200,  spent: 0, color: T.sage,  icon: "💊" },
  { id: "bills",         label: "Bills",          budget: 1000, spent: 0, color: T.bark,  icon: "📋" },
  { id: "entertainment", label: "Entertainment",  budget: 150,  spent: 0, color: T.lav,   icon: "🎬" },
  { id: "other",         label: "Other",          budget: 200,  spent: 0, color: T.taupe, icon: "📦" },
];

const QUICK_ADD = [
  { label: "☕ Coffee", amount: 4.5, cat: "dining" },
  { label: "🛒 Groceries", amount: 0, cat: "groceries" },
  { label: "⛽ Petrol", amount: 0, cat: "transport" },
  { label: "🍕 Lunch", amount: 0, cat: "dining" },
  { label: "💊 Pharmacy", amount: 0, cat: "health" },
];

export function BudgetScreen() {
  const { user, profile } = useStore();
  const [tab, setTab] = useState("overview");

  // Data state
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Add expense state
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [selCat, setSelCat] = useState("groceries");

  // Savings goal state
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");

  // Coach state
  const [coachMsgs, setCoachMsgs] = useState<CoachMessage[]>([
    { role: "assistant", content: `Hello${profile?.name ? `, ${profile.name}` : ""}! I'm your budget coach. Ask me anything about your spending — I can see your actual numbers and give you real advice.` }
  ]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);

  const totalBudget = cats.reduce((a, c) => a + c.budget, 0);
  const totalSpent  = cats.reduce((a, c) => a + c.spent, 0);
  const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const remaining = totalBudget - totalSpent;

  // Load from Firestore — source of truth per blueprint
  useEffect(() => {
    if (!user?.uid) { setHasLoaded(true); return; }
    loadData(user.uid, "budget").then(d => {
      if (d?.categories) setCats(d.categories as any);
      if (d?.expenses)   setExpenses(d.expenses as any);
      if (d?.goals)      setGoals(d.goals as any);
    }).finally(() => setHasLoaded(true));
  }, [user?.uid]);

  // Save to Firestore — only after first load per blueprint hasLoaded pattern
  const persist = async (updatedCats: Category[], updatedExpenses: Expense[], updatedGoals: SavingsGoal[]) => {
    if (!hasLoaded || !user?.uid) return;
    await saveData(user.uid, "budget", {
      categories: updatedCats,
      expenses: updatedExpenses,
      goals: updatedGoals,
    });
  };

  // ── Add Expense ───────────────────────────────────────────────────
  const addExpense = async (amt?: number, cat?: string) => {
    const finalAmt = amt || parseFloat(amount);
    const finalCat = cat || selCat;
    if (!finalAmt || isNaN(finalAmt) || finalAmt <= 0) return;

    const exp: Expense = {
      id: crypto.randomUUID(),
      amount: finalAmt,
      category: finalCat,
      merchant: merchant.trim() || finalCat,
      note: note.trim(),
      date: new Date().toISOString(),
      method: "manual",
    };

    const updatedCats = cats.map(c =>
      c.id === finalCat ? { ...c, spent: c.spent + finalAmt } : c
    );
    const updatedExpenses = [exp, ...expenses];

    setCats(updatedCats);
    setExpenses(updatedExpenses);
    setAmount(""); setMerchant(""); setNote("");

    await persist(updatedCats, updatedExpenses, goals);
    await bus.publish("budget.expense.logged", exp, { userId: user!.uid, source: "budget" });

    // Check if near limit — per blueprint threshold trigger
    const cat_data = updatedCats.find(c => c.id === finalCat);
    if (cat_data && cat_data.spent / cat_data.budget > 0.8) {
      await bus.publish("budget.threshold.hit", { category: finalCat, pct: Math.round(cat_data.spent / cat_data.budget * 100) }, { userId: user!.uid, source: "budget" });
      toast(`${cat_data.icon} ${cat_data.label} at ${Math.round(cat_data.spent / cat_data.budget * 100)}% of budget`, { icon: "⚠️" });
    } else {
      toast.success(`£${finalAmt.toFixed(2)} logged ✓`);
    }
  };

  // ── Savings Goal ──────────────────────────────────────────────────
  const addGoal = async () => {
    if (!goalName.trim() || !goalTarget) return;
    const goal: SavingsGoal = {
      id: crypto.randomUUID(),
      name: goalName.trim(),
      target: parseFloat(goalTarget),
      saved: 0,
      deadline: goalDeadline || undefined,
    };
    const updated = [...goals, goal];
    setGoals(updated);
    setGoalName(""); setGoalTarget(""); setGoalDeadline("");
    await persist(cats, expenses, updated);
    await bus.publish("budget.savings.goal.created", goal, { userId: user!.uid, source: "budget" });
    toast.success("Savings goal created ✦");
  };

  const addToGoal = async (goalId: string, amount: number) => {
    const updated = goals.map(g =>
      g.id === goalId ? { ...g, saved: Math.min(g.saved + amount, g.target) } : g
    );
    setGoals(updated);
    await persist(cats, expenses, updated);
  };

  // ── Budget Coach ──────────────────────────────────────────────────
  const askCoach = async () => {
    if (!coachInput.trim() || coachLoading) return;
    const userMsg: CoachMessage = { role: "user", content: coachInput };
    setCoachMsgs(p => [...p, userMsg]);
    setCoachInput("");
    setCoachLoading(true);

    const spendingCtx = cats.map(c => `${c.label}: £${c.spent}/${c.budget} (${Math.round(c.spent/c.budget*100)}%)`).join(", ");
    const recentExp = expenses.slice(0, 5).map(e => `£${e.amount} on ${e.category}`).join(", ");

    const sys = `You are Nora, a warm non-judgmental budget coach inside HerNest.
Current spending: ${spendingCtx}.
Recent expenses: ${recentExp || "none yet"}.
Monthly budget: £${totalBudget}. Spent: £${totalSpent}. Remaining: £${remaining}.
Give specific, actionable advice using actual numbers. Never lecture. Always validate first.`;

    const history = coachMsgs.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const result = await ai(sys, coachInput, "budget_coach", history);

    if (!result.error) {
      setCoachMsgs(p => [...p, { role: "assistant", content: result.text }]);
    } else {
      setCoachMsgs(p => [...p, { role: "assistant", content: "I'm having trouble connecting. Please try again." }]);
    }
    setCoachLoading(false);
  };

  // ── CSV Import ────────────────────────────────────────────────────
  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    toast("Nora is reading your transactions...", { icon: "✦" });

    const sys = `You are Nora categorizing bank transactions. Return ONLY valid JSON array:
[{"merchant":"string","amount":0.00,"category":"groceries|kids|fitness|dining|shopping|transport|health|bills|entertainment|other","date":"YYYY-MM-DD"}]
Parse CSV transactions and categorize them. Maximum 50 transactions.`;

    const result = await ai(sys, text.substring(0, 3000), "csv_import");
    if (result.error) { toast.error("Couldn't read CSV"); return; }

    try {
      const transactions = JSON.parse(result.text.replace(/```json|```/g, "").trim());
      let updatedCats = [...cats];
      const newExpenses: Expense[] = transactions.map((t: any) => {
        updatedCats = updatedCats.map(c =>
          c.id === t.category ? { ...c, spent: c.spent + Math.abs(t.amount) } : c
        );
        return {
          id: crypto.randomUUID(),
          amount: Math.abs(t.amount),
          category: t.category,
          merchant: t.merchant,
          note: "Imported",
          date: t.date || new Date().toISOString(),
          method: "csv" as const,
        };
      });

      const updatedExpenses = [...newExpenses, ...expenses];
      setCats(updatedCats);
      setExpenses(updatedExpenses);
      await persist(updatedCats, updatedExpenses, goals);
      toast.success(`Imported ${transactions.length} transactions ✓`);
    } catch { toast.error("Couldn't parse CSV"); }
    e.target.value = "";
  };

  return (
    <div style={{ animation: "fadeUp .45s ease both" }}>
      <PageTitle eyebrow="FINANCES" title="Budget" />

      {/* Hero */}
      <HeroCard
        eyebrow="THIS MONTH"
        title={`£${totalSpent.toLocaleString()} spent`}
        subtitle={`£${remaining.toLocaleString()} remaining · ${pct}% of budget`}
        color={pct > 90 ? T.blush : pct > 70 ? "#8B6914" : T.esp}
      >
        <div style={{ marginTop: 12 }}>
          <ProgressBar value={totalSpent} max={totalBudget} color={pct > 90 ? "#ff6b6b" : T.gold} />
        </div>
      </HeroCard>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {["overview", "add", "expenses", "goals", "coach"].map(t => (
          <Pill key={t} label={
            t === "overview" ? "Overview" :
            t === "add" ? "+ Add" :
            t === "expenses" ? "History" :
            t === "goals" ? "🎯 Goals" : "💬 Coach"
          } active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {cats.map(c => (
            <Card key={c.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.esp }}>{c.label}</span>
                    <span style={{ fontFamily: F.sans, fontSize: 12, color: c.spent > c.budget ? T.blush : T.taupe }}>
                      £{c.spent.toFixed(0)} / £{c.budget}
                    </span>
                  </div>
                  <ProgressBar value={c.spent} max={c.budget} color={c.spent > c.budget ? "#ff6b6b" : c.color} height={5} />
                </div>
              </div>
            </Card>
          ))}

          {/* CSV Import */}
          <div style={{ marginTop: 8, padding: "12px 16px", background: T.sand, borderRadius: 16, border: `1px solid ${T.linen}`, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.esp, margin: 0 }}>Import bank statement</p>
              <p style={{ fontFamily: F.sans, fontSize: 11, color: T.taupe, margin: "2px 0 0" }}>Upload CSV — Nora categorizes automatically</p>
            </div>
            <label style={{ background: T.esp, color: "#fff", borderRadius: 10, padding: "6px 14px", fontFamily: F.sans, fontSize: 12, cursor: "pointer" }}>
              Upload
              <input type="file" accept=".csv" onChange={handleCSV} style={{ display: "none" }} />
            </label>
          </div>
        </>
      )}

      {/* ── ADD EXPENSE ──────────────────────────────────────────── */}
      {tab === "add" && (
        <>
          {/* Quick add chips */}
          <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 10px" }}>QUICK ADD</p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {QUICK_ADD.map((q, i) => (
              <button key={i} onClick={() => {
                if (q.amount > 0) addExpense(q.amount, q.cat);
                else { setSelCat(q.cat); setTab("add"); }
              }} style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${T.linen}`, background: T.ivory, fontFamily: F.sans, fontSize: 12, color: T.esp, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                {q.label}
              </button>
            ))}
          </div>

          <Card>
            <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 12px" }}>LOG EXPENSE</p>
            <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (£)" type="number" step="0.01" style={{ width: "100%", background: T.sand, border: `1.5px solid ${T.linen}`, borderRadius: 12, padding: "12px 14px", fontFamily: F.sans, fontSize: 18, fontWeight: 600, color: T.esp, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
            <Input value={merchant} onChange={setMerchant} placeholder="Where? (optional)" style={{ marginBottom: 10 }} />
            <Input value={note} onChange={setNote} placeholder="Note (optional)" style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 10px" }}>CATEGORY</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {cats.map(c => (
                <button key={c.id} onClick={() => setSelCat(c.id)} style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${selCat === c.id ? c.color : T.linen}`, background: selCat === c.id ? `${c.color}20` : "#fff", color: selCat === c.id ? c.color : T.bark, fontFamily: F.sans, fontSize: 11, cursor: "pointer", fontWeight: selCat === c.id ? 700 : 400 }}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <Button onClick={() => addExpense()} disabled={!amount || isNaN(parseFloat(amount))} variant="gold">
              Log £{parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : "0.00"}
            </Button>
          </Card>
        </>
      )}

      {/* ── EXPENSE HISTORY ───────────────────────────────────────── */}
      {tab === "expenses" && (
        <>
          {expenses.length === 0 ? (
            <Card><p style={{ fontFamily: F.sans, fontSize: 14, color: T.taupe, textAlign: "center", padding: "20px 0" }}>No expenses logged yet</p></Card>
          ) : (
            expenses.slice(0, 30).map(e => {
              const cat = cats.find(c => c.id === e.category);
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: T.ivory, borderRadius: 16, border: `1px solid ${T.linen}`, marginBottom: 8 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{cat?.icon || "📦"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: F.sans, fontSize: 13, fontWeight: 600, color: T.esp, margin: 0 }}>{e.merchant || cat?.label}</p>
                    <p style={{ fontFamily: F.sans, fontSize: 11, color: T.taupe, margin: "2px 0 0" }}>
                      {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      {e.note ? ` · ${e.note}` : ""}
                      {e.method !== "manual" ? ` · ${e.method}` : ""}
                    </p>
                  </div>
                  <p style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: T.esp, margin: 0 }}>£{e.amount.toFixed(2)}</p>
                </div>
              );
            })
          )}
        </>
      )}

      {/* ── SAVINGS GOALS ─────────────────────────────────────────── */}
      {tab === "goals" && (
        <>
          <Card>
            <p style={{ fontFamily: F.sans, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.taupe, margin: "0 0 12px" }}>NEW SAVINGS GOAL</p>
            <Input value={goalName} onChange={setGoalName} placeholder="Goal name (e.g. Bali Trip)" style={{ marginBottom: 8 }} />
            <Input value={goalTarget} onChange={setGoalTarget} placeholder="Target amount (£)" type="number" style={{ marginBottom: 8 }} />
            <Input value={goalDeadline} onChange={setGoalDeadline} placeholder="Target date (optional)" type="date" style={{ marginBottom: 12 }} />
            <Button onClick={addGoal} disabled={!goalName.trim() || !goalTarget} variant="gold">Create Goal ✦</Button>
          </Card>

          {goals.map(g => {
            const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
            return (
              <Card key={g.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontFamily: F.sans, fontSize: 14, fontWeight: 700, color: T.esp, margin: 0 }}>{g.name}</p>
                    <p style={{ fontFamily: F.sans, fontSize: 11, color: T.taupe, margin: "2px 0 0" }}>
                      £{g.saved.toLocaleString()} of £{g.target.toLocaleString()} · {pct}%
                      {g.deadline ? ` · by ${new Date(g.deadline).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` : ""}
                    </p>
                  </div>
                  <span style={{ fontFamily: F.serif, fontSize: 24, color: T.gold }}>{pct}%</span>
                </div>
                <ProgressBar value={g.saved} max={g.target} color={T.gold} />
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {[10, 50, 100].map(amt => (
                    <button key={amt} onClick={() => addToGoal(g.id, amt)} style={{ flex: 1, padding: "8px", background: T.sand, border: `1px solid ${T.linen}`, borderRadius: 10, fontFamily: F.sans, fontSize: 12, color: T.esp, cursor: "pointer" }}>
                      +£{amt}
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}

          {goals.length === 0 && (
            <Card><p style={{ fontFamily: F.sans, fontSize: 14, color: T.taupe, textAlign: "center", padding: "20px 0" }}>No savings goals yet. Create one above!</p></Card>
          )}
        </>
      )}

      {/* ── BUDGET COACH ──────────────────────────────────────────── */}
      {tab === "coach" && (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "50vh" }}>
          <div style={{ flex: 1, marginBottom: 12 }}>
            {coachMsgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{ maxWidth: "85%", background: m.role === "user" ? `linear-gradient(135deg, ${T.esp}, #4a3020)` : T.ivory, borderRadius: m.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px", padding: "12px 16px", border: m.role === "assistant" ? `1px solid ${T.linen}` : "none" }}>
                  {m.content.split("\n").filter(l => l.trim()).map((line, j) => (
                    <p key={j} style={{ fontFamily: F.sans, fontSize: 13, color: m.role === "user" ? "rgba(255,255,255,.9)" : T.esp, margin: "0 0 4px", lineHeight: 1.6 }}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {coachLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
                <div style={{ background: T.ivory, borderRadius: "20px 20px 20px 4px", padding: "12px 16px", border: `1px solid ${T.linen}` }}>
                  <Spinner size={16} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.linen}`, paddingTop: 8 }}>
            <input value={coachInput} onChange={e => setCoachInput(e.target.value)} onKeyDown={e => e.key === "Enter" && askCoach()} placeholder="Ask Nora about your budget..." style={{ flex: 1, background: T.ivory, border: `1.5px solid ${T.linen}`, borderRadius: 14, padding: "11px 14px", fontFamily: F.sans, fontSize: 14, color: T.esp, outline: "none" }} />
            <button onClick={askCoach} disabled={!coachInput.trim() || coachLoading} style={{ width: 44, height: 44, borderRadius: 14, background: coachInput.trim() ? T.esp : T.linen, border: "none", color: "#fff", fontSize: 18, cursor: coachInput.trim() ? "pointer" : "not-allowed", flexShrink: 0 }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
