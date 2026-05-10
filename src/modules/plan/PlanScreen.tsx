import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, Button, Input } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { bus } from "../../core/events";

interface Task { id: string; title: string; category: string; done: boolean; priority: string; }
const CATS = ["Family","Work","Me","Home","Travel","School"];

export function PlanScreen() {
  const { user } = useStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState("tasks");
  const [input, setInput] = useState("");
  const [cat, setCat] = useState("Family");

  useEffect(() => {
    if (!user?.uid) return;
    loadData(user.uid, "tasks").then(d => { if (d?.tasks) setTasks(d.tasks); });
  }, [user?.uid]);

  const addTask = async () => {
    if (!input.trim()) return;
    const task: Task = { id: crypto.randomUUID(), title: input.trim(), category: cat, done: false, priority: "medium" };
    const updated = [task, ...tasks];
    setTasks(updated);
    setInput("");
    if (user?.uid) {
      await saveData(user.uid, "tasks", { tasks: updated });
      await bus.publish("plan.task.created", task, { userId: user.uid, source: "plan" });
    }
  };

  const toggle = async (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    setTasks(updated);
    if (user?.uid) {
      await saveData(user.uid, "tasks", { tasks: updated });
      const task = updated.find(t => t.id === id);
      if (task?.done) await bus.publish("plan.task.completed", task, { userId: user.uid, source: "plan" });
    }
  };

  const done = tasks.filter(t => t.done).length;

  return (
    <div style={{ animation: "fadeUp .45s ease both" }}>
      <PageTitle eyebrow={new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase()} title="Today's Plan" />
      <HeroCard eyebrow="PROGRESS" title={`${done} of ${tasks.length} complete`} subtitle={tasks.length ? `${Math.round(done/tasks.length*100)}% done today` : "Add your first task below"}>
        {tasks.length > 0 && <div style={{marginTop:12,background:"rgba(255,255,255,.2)",borderRadius:99,height:4,overflow:"hidden"}}><div style={{width:`${Math.round(done/tasks.length*100)}%`,height:"100%",background:T.gold,borderRadius:99,transition:"width .6s"}}/></div>}
      </HeroCard>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["tasks","calendar","meals"].map(t=><Pill key={t} label={t.charAt(0).toUpperCase()+t.slice(1)} active={tab===t} onClick={()=>setTab(t)}/>)}
      </div>
      {tab==="tasks" && <>
        <div style={{display:"flex",gap:8,marginBottom:12,overflowX:"auto",paddingBottom:4}}>
          {CATS.map(c=><Pill key={c} label={c} active={cat===c} onClick={()=>setCat(c)}/>)}
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <Input value={input} onChange={setInput} placeholder="Add a task..." style={{flex:1}} />
          <button onClick={addTask} style={{width:44,height:44,borderRadius:12,background:T.esp,border:"none",color:"#fff",fontSize:20,cursor:"pointer",flexShrink:0}}>+</button>
        </div>
        {tasks.filter(t=>!t.done).map(t=>(
          <Card key={t.id} onClick={()=>toggle(t.id)}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${T.linen}`,flexShrink:0}}/>
              <div style={{flex:1}}>
                <p style={{fontFamily:F.sans,fontSize:13,color:T.esp,margin:0}}>{t.title}</p>
                <p style={{fontFamily:F.sans,fontSize:10,color:T.taupe,margin:"2px 0 0",textTransform:"uppercase",letterSpacing:"0.08em"}}>{t.category}</p>
              </div>
            </div>
          </Card>
        ))}
        {tasks.filter(t=>t.done).length > 0 && <p style={{fontFamily:F.sans,fontSize:11,color:T.taupe,margin:"8px 0 4px",textTransform:"uppercase",letterSpacing:"0.1em"}}>{done} completed</p>}
        {tasks.filter(t=>t.done).map(t=>(
          <div key={t.id} onClick={()=>toggle(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.linen}`,opacity:0.5,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:7,background:T.sage,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12}}>✓</div>
            <p style={{fontFamily:F.sans,fontSize:13,color:T.taupe,margin:0,textDecoration:"line-through"}}>{t.title}</p>
          </div>
        ))}
      </>}
      {tab==="calendar" && <Card><p style={{fontFamily:F.sans,fontSize:14,color:T.taupe,textAlign:"center",padding:"20px 0"}}>Connect Google Calendar in Profile to see your events here</p></Card>}
      {tab==="meals" && <Card><p style={{fontFamily:F.sans,fontSize:14,color:T.taupe,textAlign:"center",padding:"20px 0"}}>Meal planner coming — ask Nora to plan your week's meals</p></Card>}
    </div>
  );
}