// ─── HerNest V2 Design System ────────────────────────────────────

export const T = {
  // Core palette
  cream:    "#F6F1E8",
  ivory:    "#FCFAF5",
  linen:    "#E8DFD0",
  sand:     "#F0E8D8",
  esp:      "#2A1F18",
  bark:     "#5C4033",
  taupe:    "#9B8577",
  stone:    "#7A6B60",

  // Brand
  gold:     "#C9A961",
  goldSoft: "#E8D9B5",
  goldP:    "rgba(201,169,97,0.12)",

  // Semantic
  sage:     "#7A9E7E",
  sageP:    "rgba(122,158,126,0.12)",
  sky:      "#5E9AB8",
  skyP:     "rgba(94,154,184,0.12)",
  blush:    "#C4846A",
  blushP:   "rgba(196,132,106,0.12)",
  lav:      "#8B7BB5",
  lavP:     "rgba(139,123,181,0.12)",
  teal:     "#5B9EA0",
  tealP:    "rgba(91,158,160,0.12)",

  // AI gradient
  aiGrad:   "linear-gradient(135deg, #2A1F18 0%, #3D2E22 50%, #1a130d 100%)",
} as const;

export const F = {
  serif:  "'Cormorant Garamond', Georgia, serif",
  sans:   "'DM Sans', 'Helvetica Neue', sans-serif",
} as const;

export const SHADOWS = {
  sm:   "0 1px 4px rgba(42,31,24,0.08)",
  md:   "0 4px 16px rgba(42,31,24,0.10)",
  lg:   "0 8px 32px rgba(42,31,24,0.12)",
  gold: "0 4px 20px rgba(201,169,97,0.20)",
} as const;
