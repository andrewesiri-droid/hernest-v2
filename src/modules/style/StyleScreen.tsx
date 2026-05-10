import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, AIBadge, Spinner } from "../../shared/components";
import { ai } from "../../core/ai";

const OCCASIONS = ["Board meeting","School run","Date night","Weekend casual","Gym","Girls dinner","Holiday","WFH"];
const MOODS = ["Powerful","Relaxed","Playful","Elegant","Sporty","Romantic"];

export function StyleScreen() {
  const { profile } = useStore();
  const [occasion, setOccasion] = useState("");
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [outfit, setOutfit] = useState<string>("");
  const [saved, setSaved] = useState<string[]>([]);

  const generate = async () => {
    if (!occasion || !mood) return;
    setLoading(true);
    const sys = `You are Nora, a warm personal stylist. Create a complete outfit recommendation. Be specific about items, colors, and why it works. Format naturally in paragraphs. 2-3 paragraphs max.`;
    const prompt = `Occasion: ${occasion}. Mood: ${mood}. Style: ${profile?.style?.vibe||"classic elegant"}. Budget: ${profile?.style?.budget||"mid-range"}.`;
    const result = await ai(sys, prompt, "style_stylist");
    if (!result.error) setOutfit(result.text);
    setLoading(false);
  };

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="PERSONAL STYLIST" title="Style Me"/>
      <HeroCard eyebrow="NORA'S EYE" title="What's the occasion?" subtitle="Tell me where you're going and how you want to feel"/>
      <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 10px"}}>OCCASION</p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {OCCASIONS.map(o=><button key={o} onClick={()=>setOccasion(o)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${occasion===o?T.esp:T.linen}`,background:occasion===o?T.esp:"#fff",color:occasion===o?"#fff":T.bark,fontFamily:F.sans,fontSize:12,cursor:"pointer"}}>{o}</button>)}
        </div>
      </Card>
      <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 10px"}}>HOW DO YOU WANT TO FEEL?</p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {MOODS.map(m=><button key={m} onClick={()=>setMood(m)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${mood===m?T.gold:T.linen}`,background:mood===m?T.goldP:"#fff",color:mood===m?T.gold:T.bark,fontFamily:F.sans,fontSize:12,cursor:"pointer"}}>{m}</button>)}
        </div>
      </Card>
      <button onClick={generate} disabled={!occasion||!mood||loading} style={{width:"100%",padding:"14px",background:occasion&&mood?`linear-gradient(135deg,${T.esp},#4a2e18)`:T.linen,color:occasion&&mood?"#fff":T.taupe,border:"none",borderRadius:16,fontFamily:F.sans,fontSize:15,fontWeight:700,cursor:occasion&&mood?"pointer":"not-allowed",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {loading?<><Spinner size={16} color="#fff"/>Creating your look...</>:"✦ Style Me"}
      </button>
      {outfit && <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <AIBadge label="Styled by Nora"/>
          <button onClick={()=>setSaved(p=>[outfit,...p])} style={{background:T.goldP,border:`1px solid ${T.gold}40`,borderRadius:10,padding:"4px 10px",fontFamily:F.sans,fontSize:11,color:T.gold,cursor:"pointer"}}>Save ♥</button>
        </div>
        {outfit.split("\n").filter(l=>l.trim()).map((p,i)=><p key={i} style={{fontFamily:F.sans,fontSize:14,color:T.esp,lineHeight:1.7,margin:"0 0 10px"}}>{p}</p>)}
      </Card>}
      {saved.length > 0 && <>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"16px 0 10px"}}>SAVED LOOKS ({saved.length})</p>
        {saved.map((s,i)=><Card key={i}><p style={{fontFamily:F.sans,fontSize:13,color:T.esp,lineHeight:1.6,margin:0}}>{s.substring(0,120)}...</p></Card>)}
      </>}
    </div>
  );
}