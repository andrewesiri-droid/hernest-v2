// ─── HerNest Global Store (Zustand) ──────────────────────────────
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  city: string;
  role: string;
  kids: Array<{ id: string; name: string; age: number; school?: string }>;
  partner?: string;
  parents: Array<{ name: string; birthday?: string }>;
  inlaws: Array<{ name: string; birthday?: string }>;
  priorities: string[];
  tripGoal: string;
  fitnessGoal: string;
  savingsGoal: string;
  challenge: string;
  soloParent: boolean;
  energyPattern: "morning" | "evening" | "variable";
  diet: string;
  style?: {
    bodyShape: string;
    size: string;
    height: string;
    vibe: string;
    dressCode: string;
    budget: string;
  };
}

interface AppStore {
  // Auth
  user: { uid: string; email: string; displayName: string | null } | null;
  authChecked: boolean;
  profile: UserProfile | null;

  // Navigation
  activeTab: string;
  screen: "loading" | "login" | "onboarding" | "app";

  // UI
  showMore: boolean;
  showSettings: boolean;
  showUpgrade: boolean;
  isOnline: boolean;

  // AI Usage
  dailyUsage: number;
  usageLimit: number;

  // Actions
  setUser: (user: AppStore["user"]) => void;
  setAuthChecked: (checked: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (partial: Partial<UserProfile>) => void;
  setScreen: (screen: AppStore["screen"]) => void;
  setActiveTab: (tab: string) => void;
  setShowMore: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowUpgrade: (show: boolean) => void;
  setIsOnline: (online: boolean) => void;
  incrementUsage: () => void;
  reset: () => void;
}

const defaultProfile: UserProfile = {
  uid: "",
  name: "",
  email: "",
  avatar: "👩",
  city: "",
  role: "",
  kids: [],
  parents: [],
  inlaws: [],
  priorities: [],
  tripGoal: "",
  fitnessGoal: "",
  savingsGoal: "",
  challenge: "",
  soloParent: false,
  energyPattern: "morning",
  diet: "",
};

export const useStore = create<AppStore>()(
  immer((set) => ({
    user: null,
    authChecked: false,
    profile: null,
    activeTab: "home",
    screen: "loading",
    showMore: false,
    showSettings: false,
    showUpgrade: false,
    isOnline: navigator.onLine,
    dailyUsage: 0,
    usageLimit: 10,

    setUser: (user) => set((s) => { s.user = user; }),
    setAuthChecked: (checked) => set((s) => { s.authChecked = checked; }),
    setProfile: (profile) => set((s) => { s.profile = profile; }),
    updateProfile: (partial) => set((s) => {
      if (s.profile) Object.assign(s.profile, partial);
    }),
    setScreen: (screen) => set((s) => { s.screen = screen; }),
    setActiveTab: (tab) => set((s) => { s.activeTab = tab; }),
    setShowMore: (show) => set((s) => { s.showMore = show; }),
    setShowSettings: (show) => set((s) => { s.showSettings = show; }),
    setShowUpgrade: (show) => set((s) => { s.showUpgrade = show; }),
    setIsOnline: (online) => set((s) => { s.isOnline = online; }),
    incrementUsage: () => set((s) => { s.dailyUsage += 1; }),
    reset: () => set((s) => {
      s.user = null;
      s.profile = null;
      s.screen = "login";
      s.activeTab = "home";
      s.dailyUsage = 0;
    }),
  }))
);
