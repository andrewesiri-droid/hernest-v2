import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, ProgressBar } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { bus } from "../../core/events";

export function ThriveScreen() {
  const { user } = useStore();
  const [tab, setTab] = useState("today");
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [habits, setHabits] = useState([
    {id:"water",label:"Drink 8 glasses",icon:"💧",done:false},
    {id:"move",label:"Move your body",icon:"🏃",done:false},
    {id:"mindful",label:"5 min mindfulness",icon:"🧘",done:false},
    {id:"nourish",label:"Eat well today",icon:"🥗",done:false},
  ]);

  useEffect(()=>{ if(!user?.uid)return; loadData(user.uid,"thrive").then(d=>{ if(d?.water)setWater(d.water as any); if(d?.sleep)setSleep(d.sleep as any); if(d?.habits)setHabits(d.habits as any); }); },[user?.uid]);

  const toggleHabit = async (id:string) => {
    const updated = habits.map(h=>h.id===id?{...h,done:!h.done}:h);
    setHabits(updated);
    if(user?.uid){ await saveData(user.uid,"thrive",{habits:updated,water,sleep}); await bus.publish("thrive.habit.completed",{id},{userId:user.uid,source:"thrive"}); }
  };

  const logWater = async (v:number) => { setWater(v); if(user?.uid)await saveData(user.uid,"thrive",{habits,water:v,sleep}); };
  const done = habits.filter(h=>h.done).length;

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="WELLNESS" title="Thrive"/>
      <HeroCard eyebrow="THIS WEEK" title={`${done} of ${habits.length} habits`} subtitle="Keep going — you're doing great" color={done===habits.length?T.sage:T.esp}>
        <div style={{marginTop:12}}><ProgressBar value={done} max={habits.length} color={T.gold}/></div>
      </HeroCard>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["today","score"].map(t=><Pill key={t} label={t==="today"?"Today":"Weekly Score"} active={tab===t} onClick={()=>setTab(t)}/>)}
      </div>
      {tab==="today" && <>
        <Card>
          <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>HABITS</p>
          {habits.map(h=>(
            <div key={h.id} onClick={()=>toggleHabit(h.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.linen}`,cursor:"pointer"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:h.done?T.sageP:T.sand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{h.icon}</div>
              <p style={{fontFamily:F.sans,fontSize:13,color:h.done?T.taupe:T.esp,margin:0,textDecoration:h.done?"line-through":"none",flex:1}}>{h.label}</p>
              {h.done && <span style={{color:T.sage,fontSize:16}}>✓</span>}
            </div>
          ))}
        </Card>
        <Card>
          <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>WATER TODAY</p>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontFamily:F.serif,fontSize:32,fontWeight:600,color:T.sky}}>{water}<span style={{fontFamily:F.sans,fontSize:14,color:T.taupe}}>/8</span></span>
          </div>
          <div style={{display:"flex",gap:4}}>
            {Array.from({length:8},(_,i)=>(
              <div key={i} onClick={()=>logWater(i<water?i:i+1)} style={{flex:1,height:32,borderRadius:8,cursor:"pointer",background:i<water?T.sky:T.skyP,transition:"background .15s"}}/>
            ))}
          </div>
        </Card>
        <Card>
          <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>SLEEP LAST NIGHT</p>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[4,5,6,7,8,9].map(h=>(
              <button key={h} onClick={async()=>{setSleep(h);if(user?.uid){await saveData(user.uid,"thrive",{habits,water,sleep:h});await bus.publish("thrive.sleep.logged",{hours:h},{userId:user.uid||"",source:"thrive"});}}} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${sleep===h?T.sky:T.linen}`,background:sleep===h?T.skyP:"#fff",fontFamily:F.sans,fontSize:13,fontWeight:sleep===h?700:400,color:sleep===h?T.sky:T.bark,cursor:"pointer"}}>{h}h</button>
            ))}
          </div>
        </Card>
      </>}
      {tab==="score" && <Card><p style={{fontFamily:F.sans,fontSize:14,color:T.taupe,textAlign:"center",padding:"20px 0"}}>Chat with Nora about your wellness to get your weekly score</p></Card>}
    </div>
  );
}