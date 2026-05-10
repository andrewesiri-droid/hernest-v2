import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { Button, Input } from "../../shared/components";
import { useStore } from "../../core/store";
import { saveData } from "../../core/firebase";

const STEPS = [
  { id: "name",      question: "First, what's your name?",                    placeholder: "Your first name" },
  { id: "challenge", question: "What's your biggest mental load right now?",   placeholder: "e.g. Juggling work and school pickup" },
  { id: "goal",      question: "What would make your life feel more manageable?", placeholder: "e.g. Feeling less overwhelmed in the mornings" },
];

export function OnboardingScreen() {
  const { user, setScreen, setProfile } = useStore();
  const [step, setStep]   = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const current = STEPS[step];
  const value = values[current.id] || "";

  const next = async () => {
    if (!value.trim()) return;
    const updated = { ...values, [current.id]: value };
    setValues(updated);

    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      // Complete onboarding
      setLoading(true);
      const profile = {
        uid: user?.uid || "",
        name: updated.name || "",
        email: user?.email || "",
        avatar: "👩",
        city: "", role: "",
        kids: [], parents: [], inlaws: [],
        priorities: [],
        tripGoal: "", fitnessGoal: "",
        savingsGoal: "",
        challenge: updated.challenge || "",
        soloParent: false,
        energyPattern: "morning" as const,
        diet: "",
      };
      setProfile(profile);
      if (user?.uid) await saveData(user.uid, "profile", profile);
      setScreen("app");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.cream, display: "flex", flexDirection: "column", padding: "60px 24px 40px" }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 48 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= step ? T.gold : T.linen, transition: "background .3s" }} />
        ))}
      </div>

      {/* Nora avatar */}
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${T.gold}, #8B6914)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 0 24px rgba(201,169,97,.3)" }}>
        <span style={{ fontSize: 24 }}>✦</span>
      </div>

      <p style={{ fontFamily: F.sans, fontSize: 11, color: T.gold, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600, marginBottom: 12 }}>
        NORA
      </p>

      <h2 style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 28, color: T.esp, fontWeight: 500, marginBottom: 32, lineHeight: 1.3 }}>
        {current.question}
      </h2>

      <Input
        value={value}
        onChange={(v) => setValues(prev => ({ ...prev, [current.id]: v }))}
        placeholder={current.placeholder}
        style={{ marginBottom: 16, fontSize: 16 }}
      />

      <Button onClick={next} disabled={!value.trim() || loading} variant="gold">
        {loading ? "Setting up your nest..." : step < STEPS.length - 1 ? "Continue →" : "Meet Nora →"}
      </Button>

      <p style={{ fontFamily: F.sans, fontSize: 11, color: T.taupe, textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
        Nora learns from what you share. The more you tell her, the better she knows you.
      </p>
    </div>
  );
}
