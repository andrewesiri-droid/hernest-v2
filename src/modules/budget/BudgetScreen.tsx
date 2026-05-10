import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, ProgressBar } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { bus } from "../../core/events";

const DEFAULT_CATS = [
  {id:"groceries",label:"Groceries",budget:700,spent:0,color:T.sage,icon:"🛒"},
  {id:"kids",label:"Kids",budget:400,spent:0,color:T.sky,icon:"🧒"},
  {id:"fitness",label:"Fitness",budget:120,spent:0,color:T.blush,icon:"💪"},
  {id:"dining",label:"Dining",budget:300,spent:0,color:T.gold,icon:"🍽"},
  {id:"shopping",label:"Shopping",budget:500,spent:0,color:T.lav,icon:"🛍"},
  {id:"bills",label:"Bills",budget:1000,spent:0,color:T.bark,icon:"📋"},
];

export function BudgetScreen() {
  const { user } = useStore();
  const [cats, setCats] = useState(DEFAULT_CATS);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tab, setTab] = useState("overview");
  const [amount, setAmount] = useState("");
  const [selCat, setSelCat] = useState("groceries");
  const [note, setNote] = useState("");

  const total = cats.reduce((a,c)=>a+c.budget,0);
  const spent = cats.reduce((a,c)=>a+c.spent,0);
  const pct = total > 0 ? Math.round(spent/total*100) : 0;

  useEffect(()=>{ if(!user?.uid)return; loadData(user.uid,"budget").then(d=>{ if(d?.categories)setCats(d.categories); if(d?.expenses)setExpenses(d.expenses); }); },[user?.uid]);

  const logExpense = async () => {
    if (!amount || isNaN(Number(amount))) return;
    const amt = parseFloat(amount);
    const exp = { id: crypto.randomUUID(), amount: amt, category: selCat, note, date: new Date().toISOString() };
    const updatedCats = cats.map(c => c.id===selCat ? {...c, spent: c.spent+amt} : c);
    const updatedExp = [exp, ...expenses];
    setCats(updatedCats); setExpenses(updatedExp);
    setAmount(""); setNote("");
    if (user?.uid) {
      await saveData(user.uid,"budget",{categories:updatedCats,expenses:updatedExp});
      await bus.publish("budget.expense.logged", exp, {userId:user.uid,source:"budget"});
    }
  };

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="FINANCES" title="Budget" />
      <HeroCard eyebrow="THIS MONTH" title={`£${spent.toLocaleString()} spent`} subtitle={`of £${total.toLocaleString()} budget · ${pct}% used`} color={pct>80?T.blush:T.esp}>
        <div style={{marginTop:12}}><ProgressBar value={spent} max={total} color={pct>80?"#ff6b6b":T.gold}/></div>
      </HeroCard>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {["overview","add","expenses"].map(t=><Pill key={t} label={t.charAt(0).toUpperCase()+t.slice(1)} active={tab===t} onClick={()=>setTab(t)}/>)}
      </div>
      {tab==="overview" && cats.map(c=>(
        <Card key={c.id}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <span style={{fontSize:20}}>{c.icon}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontFamily:F.sans,fontSize:13,fontWeight:600,color:T.esp}}>{c.label}</span>
                <span style={{fontFamily:F.sans,fontSize:13,color:T.taupe}}>£{c.spent} / £{c.budget}</span>
              </div>
            </div>
          </div>
          <ProgressBar value={c.spent} max={c.budget} color={c.color} height={4}/>
        </Card>
      ))}
      {tab==="add" && <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,marginBottom:12}}>LOG EXPENSE</p>
        <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Amount (£)" type="number" style={{width:"100%",background:T.sand,border:`1.5px solid ${T.linen}`,borderRadius:12,padding:"11px 14px",fontFamily:F.sans,fontSize:16,color:T.esp,outline:"none",marginBottom:10,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
          {cats.map(c=><button key={c.id} onClick={()=>setSelCat(c.id)} style={{background:selCat===c.id?c.color:T.sand,color:selCat===c.id?"#fff":T.bark,border:"none",borderRadius:20,padding:"6px 12px",fontFamily:F.sans,fontSize:11,cursor:"pointer"}}>{c.icon} {c.label}</button>)}
        </div>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)" style={{width:"100%",background:T.sand,border:`1.5px solid ${T.linen}`,borderRadius:12,padding:"11px 14px",fontFamily:F.sans,fontSize:14,color:T.esp,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
        <button onClick={logExpense} disabled={!amount} style={{width:"100%",padding:"12px",background:T.esp,color:"#fff",border:"none",borderRadius:14,fontFamily:F.sans,fontSize:14,fontWeight:600,cursor:amount?"pointer":"not-allowed",opacity:amount?1:0.5}}>Log Expense</button>
      </Card>}
      {tab==="expenses" && (expenses.length===0 ? <Card><p style={{fontFamily:F.sans,fontSize:14,color:T.taupe,textAlign:"center",padding:"20px 0"}}>No expenses logged yet</p></Card> :
        expenses.slice(0,20).map((e:any)=>(
          <Card key={e.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <p style={{fontFamily:F.sans,fontSize:13,fontWeight:600,color:T.esp,margin:0}}>{cats.find(c=>c.id===e.category)?.label||e.category}</p>
                <p style={{fontFamily:F.sans,fontSize:11,color:T.taupe,margin:"2px 0 0"}}>{e.note||new Date(e.date).toLocaleDateString()}</p>
              </div>
              <p style={{fontFamily:F.serif,fontSize:20,fontWeight:600,color:T.esp,margin:0}}>£{e.amount}</p>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}