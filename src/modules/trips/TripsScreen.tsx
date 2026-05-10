import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Button, Input } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { bus } from "../../core/events";

interface Trip { id:string; dest:string; date:string; nights:number; budget:number; status:string; }

export function TripsScreen() {
  const { user } = useStore();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [dest, setDest] = useState(""); const [date, setDate] = useState(""); const [nights, setNights] = useState(""); const [budget, setBudget] = useState("");

  useEffect(()=>{ if(!user?.uid)return; loadData(user.uid,"trips").then(d=>{ if(d?.trips)setTrips(d.trips); }); },[user?.uid]);

  const addTrip = async () => {
    if (!dest||!date) return;
    const trip:Trip = {id:crypto.randomUUID(),dest,date,nights:parseInt(nights)||7,budget:parseInt(budget)||0,status:"Planning"};
    const updated = [trip,...trips];
    setTrips(updated); setShowAdd(false); setDest(""); setDate(""); setNights(""); setBudget("");
    if(user?.uid){ await saveData(user.uid,"trips",{trips:updated}); await bus.publish("trips.trip.created",trip,{userId:user.uid,source:"trips"}); }
  };

  const daysUntil = (date:string) => Math.ceil((new Date(date).getTime()-Date.now())/(1000*60*60*24));

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="ADVENTURES" title="Trips"/>
      <HeroCard eyebrow="NEXT TRIP" title={trips[0]?.dest||"Where to next?"} subtitle={trips[0]?`${daysUntil(trips[0].date)} days away · ${trips[0].nights} nights`:"Add your first trip below"}/>
      <Button onClick={()=>setShowAdd(!showAdd)} variant="gold" style={{marginBottom:16}}>+ Plan a Trip</Button>
      {showAdd && <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>NEW TRIP</p>
        <Input value={dest} onChange={setDest} placeholder="Destination" style={{marginBottom:8}}/>
        <Input value={date} onChange={setDate} placeholder="Departure date" type="date" style={{marginBottom:8}}/>
        <Input value={nights} onChange={setNights} placeholder="Nights" type="number" style={{marginBottom:8}}/>
        <Input value={budget} onChange={setBudget} placeholder="Budget (£)" type="number" style={{marginBottom:12}}/>
        <Button onClick={addTrip} disabled={!dest||!date}>Add Trip →</Button>
      </Card>}
      {trips.map(t=>(
        <Card key={t.id}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <h3 style={{fontFamily:F.serif,fontSize:20,fontStyle:"italic",color:T.esp,margin:"0 0 4px"}}>{t.dest}</h3>
              <p style={{fontFamily:F.sans,fontSize:12,color:T.taupe,margin:0}}>{t.nights} nights · {new Date(t.date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</p>
            </div>
            <div style={{background:T.goldP,border:`1px solid ${T.gold}40`,borderRadius:20,padding:"4px 12px"}}>
              <span style={{fontFamily:F.sans,fontSize:11,color:T.gold,fontWeight:600}}>{daysUntil(t.date)>0?`${daysUntil(t.date)}d away`:"Now!"}</span>
            </div>
          </div>
          {t.budget>0 && <p style={{fontFamily:F.sans,fontSize:12,color:T.taupe,margin:"8px 0 0"}}>Budget: £{t.budget.toLocaleString()}</p>}
        </Card>
      ))}
    </div>
  );
}