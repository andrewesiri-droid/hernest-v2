import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle } from "../../shared/components";
import toast from "react-hot-toast";

const PLANS = [
  { id:"monthly", label:"Monthly", price:"£7.99",  period:"/month", saving:"" },
  { id:"annual",  label:"Annual",  price:"£59.99", period:"/year",  saving:"Save 37%" },
];

const PRO_FEATURES = [
  { icon:"✦", label:"Unlimited AI requests" },
  { icon:"🧠", label:"Nora's full memory" },
  { icon:"◈", label:"Google + Outlook calendar sync" },
  { icon:"🎨", label:"Full Style AI" },
  { icon:"✈️", label:"Complete trip planning" },
  { icon:"◎", label:"Budget Coach + CSV import" },
  { icon:"◦", label:"Weekly wellness score" },
  { icon:"👫", label:"Partner sharing" },
];

export function UpgradeScreen() {
  const { user } = useStore();
  const [plan, setPlan] = useState("monthly");
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const idToken = await (user as any)?.getIdToken?.();
      const priceId = import.meta.env.VITE_STRIPE_PRICE_ID;
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":`Bearer ${idToken}` },
        body: JSON.stringify({ priceId, userId: user?.uid }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
      else toast.error("Couldn't start checkout");
    } catch { toast.error("Couldn't start checkout"); }
    setLoading(false);
  };

  return (
    <div style={{ animation:"fadeUp .45s ease both" }}>
      <PageTitle eyebrow="UPGRADE" title="HerNest Pro"/>
      <div style={{ background:`linear-gradient(135deg,${T.esp},#3D2E22)`, borderRadius:24, padding:"28px 24px", marginBottom:20, textAlign:"center" }}>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"rgba(255,255,255,0.5)", margin:"0 0 8px" }}>UNLOCK EVERYTHING</p>
        <p style={{ fontFamily:F.serif, fontSize:32, fontStyle:"italic", color:"#fff", margin:"0 0 8px" }}>Your AI chief of staff</p>
        <p style={{ fontFamily:F.sans, fontSize:14, color:T.gold, margin:0 }}>Unlimited Nora. Full intelligence.</p>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {PLANS.map(p=>(
          <button key={p.id} onClick={()=>setPlan(p.id)} style={{ flex:1, padding:"14px", borderRadius:16, border:`2px solid ${plan===p.id?T.gold:T.linen}`, background:plan===p.id?T.goldP:"#fff", cursor:"pointer", touchAction:"manipulation", position:"relative" }}>
            {p.saving && <span style={{ position:"absolute", top:-10, right:10, background:T.sage, color:"#fff", fontFamily:F.sans, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 }}>{p.saving}</span>}
            <p style={{ fontFamily:F.sans, fontSize:12, color:T.taupe, margin:"0 0 4px" }}>{p.label}</p>
            <p style={{ fontFamily:F.serif, fontSize:26, fontWeight:700, color:plan===p.id?T.gold:T.esp, margin:0 }}>{p.price}</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:T.taupe, margin:0 }}>{p.period}</p>
          </button>
        ))}
      </div>
      <Card>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>EVERYTHING IN PRO</p>
        {PRO_FEATURES.map((f,i)=>(
          <div key={i} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:i<PRO_FEATURES.length-1?`1px solid ${T.linen}`:"none" }}>
            <span style={{ fontSize:18, flexShrink:0 }}>{f.icon}</span>
            <p style={{ fontFamily:F.sans, fontSize:13, color:T.esp, margin:0 }}>{f.label}</p>
          </div>
        ))}
      </Card>
      <button onClick={handleUpgrade} disabled={loading} style={{ width:"100%", padding:"16px", background:`linear-gradient(135deg,${T.gold},#8B6914)`, color:"#fff", border:"none", borderRadius:16, fontFamily:F.sans, fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:8, minHeight:56, touchAction:"manipulation" }}>
        {loading?"Loading...":`Start Pro — ${PLANS.find(p=>p.id===plan)?.price}${PLANS.find(p=>p.id===plan)?.period}`}
      </button>
      <p style={{ fontFamily:F.sans, fontSize:11, color:T.taupe, textAlign:"center", margin:0 }}>Cancel anytime · 14-day money-back guarantee</p>
    </div>
  );
}
