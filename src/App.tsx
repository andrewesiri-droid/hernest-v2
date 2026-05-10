// ─── HerNest V2 App ───────────────────────────────────────────────
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./core/firebase";
import { useStore } from "./core/store";
import { bus } from "./core/events";
import { ROUTES } from "./config";
import { F, T } from "./config/theme";
import { TabBar } from "./shared/components/TabBar";

// Screens
import { LoginScreen }      from "./modules/auth/LoginScreen";
import { OnboardingScreen } from "./modules/onboarding/OnboardingScreen";
import { HomeScreen }       from "./modules/home/HomeScreen";
import { NoraScreen }       from "./modules/nora/NoraScreen";
import { PlanScreen }       from "./modules/plan/PlanScreen";
import { BudgetScreen }     from "./modules/budget/BudgetScreen";
import { BriefingScreen }   from "./modules/briefing/BriefingScreen";
import { ThriveScreen }     from "./modules/thrive/ThriveScreen";
import { StyleScreen }      from "./modules/style/StyleScreen";
import { TripsScreen }      from "./modules/trips/TripsScreen";
import { CircleScreen }     from "./modules/circle/CircleScreen";
import { ProfileScreen }    from "./modules/profile/ProfileScreen";

// Global styles
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=DM+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { background: ${T.cream}; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
  button { -webkit-tap-highlight-color: transparent; cursor: pointer; }
  input, textarea, select { font-family: 'DM Sans', sans-serif; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes breathe { 0%,100% { transform:scale(1) } 50% { transform:scale(1.04) } }
  @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }
`;

export default function App() {
  const { screen, setScreen, setUser, setAuthChecked, setProfile, setShowUpgrade, setIsOnline } = useStore();

  // Auth listener
  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email || "", displayName: u.displayName });
        await bus.publish("auth.user.signed_in", { uid: u.uid }, { userId: u.uid, source: "app" });
        setScreen("app");
      } else {
        setUser(null);
        setScreen("login");
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // Online/offline
  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online",  online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  // AI limit
  useEffect(() => {
    const handler = () => setShowUpgrade(true);
    window.addEventListener("hn_limit_reached", handler);
    return () => window.removeEventListener("hn_limit_reached", handler);
  }, []);

  if (screen === "loading") {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.esp }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: F.serif, fontStyle: "italic", fontSize: 40, color: T.gold, fontWeight: 400 }}>HerNest</h1>
          <p style={{ fontFamily: F.sans, fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 8 }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (screen === "login") return (
    <>
      <style>{globalStyles}</style>
      <LoginScreen />
    </>
  );

  if (screen === "onboarding") return (
    <>
      <style>{globalStyles}</style>
      <OnboardingScreen />
    </>
  );

  return (
    <>
      <style>{globalStyles}</style>
      <BrowserRouter>
        <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: T.cream, position: "relative" }}>
          <AppContent />
          <TabBar />
          <Toaster position="bottom-center" toastOptions={{ style: { fontFamily: F.sans, fontSize: 13, background: T.esp, color: "#fff", borderRadius: 20, padding: "10px 18px" } }} />
        </div>
      </BrowserRouter>
    </>
  );
}

function AppContent() {
  const { activeTab } = useStore();

  const screens: Record<string, React.ReactNode> = {
    home:     <HomeScreen />,
    nora:     <NoraScreen />,
    plan:     <PlanScreen />,
    budget:   <BudgetScreen />,
    briefing: <BriefingScreen />,
    thrive:   <ThriveScreen />,
    style:    <StyleScreen />,
    trips:    <TripsScreen />,
    circle:   <CircleScreen />,
    profile:  <ProfileScreen />,
  };

  return (
    <div style={{ padding: "16px 16px calc(90px + env(safe-area-inset-bottom, 0px))", animation: "fadeUp .3s ease both" }}>
      {screens[activeTab] || <HomeScreen />}
    </div>
  );
}
