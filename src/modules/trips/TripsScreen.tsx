import React, { useState, useEffect } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Pill, Button, Input, AIBadge, Spinner, ProgressBar } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { ai } from "../../core/ai";
import { bus } from "../../core/events";
import toast from "react-hot-toast";

interface Trip {
  id: string; dest: string; date: string; nights: number;
  budget: number; travellers: number; status: "Planning"|"Booked"|"Completed";
  plan?: TripPlan; packingList?: PackingItem[];
}
interface TripPlan {
  days: { day: number; title: string; activities: string[] }[];
  highlights: string[]; familyTips: string[]; budgetBreakdown: { cat: string; amount: number }[];
}
interface PackingItem { id: string; label: string; category: "Mum"|"Kids"|"Everyone"; done: boolean; }

const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000*60*60*24));

export function TripsScreen() {
  const { user, profile } = useStore();
  const [trips, setTrips]     = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip|null>(null);
  const [tab, setTab]         = useState("overview");
  const [showAdd, setShowAdd] = useState(false);
  const [planning, setPlanning] = useState(false);

  // Form state
  const [dest, setDest]         = useState("");
  const [date, setDate]         = useState("");
  const [nights, setNights]     = useState("");
  const [budget, setBudget]     = useState("");
  const [travellers, setTravellers] = useState("2");

  useEffect(() => {
    if (!user?.uid) return;
    loadData(user.uid, "trips").then(d => { if (d?.trips) setTrips(d.trips as Trip[]); });
  }, [user?.uid]);

  const persist = async (updated: Trip[]) => {
    if (!user?.uid) return;
    setTrips(updated);
    await saveData(user.uid, "trips", { trips: updated });
  };

  const addTrip = async () => {
    if (!dest || !date) return;
    const trip: Trip = {
      id: crypto.randomUUID(), dest, date,
      nights: parseInt(nights)||7, budget: parseInt(budget)||0,
      travellers: parseInt(travellers)||2, status: "Planning",
    };
    const updated = [trip, ...trips];
    await persist(updated);
    setActiveTrip(trip);

    // Publish event — budget module listens to create savings goal per blueprint
    if (user?.uid) {
      await bus.publish("trips.trip.created", trip, { userId: user.uid, source: "trips" });
      if (trip.budget > 0) toast(`Trip added! Go to Budget → Goals to track your ${dest} savings 💛`, { duration: 4000 });
    }

    setDest(""); setDate(""); setNights(""); setBudget(""); setTravellers("2");
    setShowAdd(false);
  };

  const generatePlan = async (trip: Trip) => {
    setPlanning(true);
    const kids = profile?.kids?.length || 0;
    const sys = `You are Nora, a travel planner. Return ONLY valid JSON:
{"days":[{"day":1,"title":"string","activities":["string","string","string"]}],"highlights":["string"],"familyTips":["string"],"budgetBreakdown":[{"cat":"string","amount":0}]}
Create a ${trip.nights}-day itinerary for ${trip.dest}. ${kids>0?`Family with ${kids} kids.`:""} Budget: £${trip.budget}. Include family-friendly activities, local food, and rest time. 3 days max for brevity.`;

    const result = await ai(sys, `Plan trip to ${trip.dest}, ${trip.nights} nights, £${trip.budget} budget`, "trip_planner");
    if (!result.error) {
      try {
        const plan = JSON.parse(result.text.replace(/```json|```/g,"").trim()) as TripPlan;
        const updated = trips.map(t => t.id===trip.id ? {...t, plan} : t);
        await persist(updated);
        setActiveTrip({...trip, plan});
        toast.success("Trip plan ready ✦");
      } catch { toast.error("Couldn't generate plan"); }
    }
    setPlanning(false);
  };

  const generatePackingList = async (trip: Trip) => {
    const kids = profile?.kids?.map((k:any)=>k.name).join(", ") || "none";
    const sys = `You are Nora. Return ONLY valid JSON array:
[{"label":"string","category":"Mum|Kids|Everyone"}]
Generate a smart packing list for ${trip.dest}, ${trip.nights} nights. Kids: ${kids}. Max 30 items.`;

    const result = await ai(sys, `Packing list for ${trip.dest}`, "trip_planner");
    if (!result.error) {
      try {
        const items = JSON.parse(result.text.replace(/```json|```/g,"").trim());
        const packingList: PackingItem[] = items.map((i:any) => ({ id: crypto.randomUUID(), ...i, done: false }));
        const updated = trips.map(t => t.id===trip.id ? {...t, packingList} : t);
        await persist(updated);
        setActiveTrip({...trip, packingList});
        toast.success(`${packingList.length} items added ✦`);
      } catch { toast.error("Couldn't generate packing list"); }
    }
  };

  const togglePacking = async (tripId: string, itemId: string) => {
    const trip = trips.find(t => t.id===tripId);
    if (!trip?.packingList) return;
    const updated = trips.map(t => t.id===tripId ? {
      ...t, packingList: t.packingList!.map(i => i.id===itemId ? {...i, done:!i.done} : i)
    } : t);
    await persist(updated);
    setActiveTrip(updated.find(t=>t.id===tripId)||null);
  };

  // Trip detail view
  if (activeTrip) {
    const trip = trips.find(t=>t.id===activeTrip.id) || activeTrip;
    const du = daysUntil(trip.date);
    const packedCount = trip.packingList?.filter(i=>i.done).length || 0;
    const totalItems  = trip.packingList?.length || 0;

    return (
      <div style={{ animation:"fadeUp .45s ease both" }}>
        <button onClick={()=>setActiveTrip(null)} style={{ background:"none", border:"none", fontFamily:F.sans, fontSize:13, color:T.taupe, cursor:"pointer", marginBottom:12, padding:"8px 0", minHeight:44, touchAction:"manipulation" }}>← All trips</button>

        <HeroCard eyebrow={du>0?`${du} DAYS AWAY`:"NOW!"} title={trip.dest} subtitle={`${trip.nights} nights · ${new Date(trip.date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})} · £${trip.budget.toLocaleString()}`} color={T.esp}/>

        <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
          {["overview","itinerary","packing"].map(t=>(
            <Pill key={t} label={t==="overview"?"Overview":t==="itinerary"?"📅 Itinerary":"🧳 Packing"} active={tab===t} onClick={()=>setTab(t)}/>
          ))}
        </div>

        {tab==="overview" && <>
          <Card>
            <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>TRIP DETAILS</p>
            {[
              { label:"Destination", value:trip.dest },
              { label:"Departure",   value:new Date(trip.date).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}) },
              { label:"Duration",    value:`${trip.nights} nights` },
              { label:"Travellers",  value:`${trip.travellers} people` },
              { label:"Budget",      value:`£${trip.budget.toLocaleString()}` },
              { label:"Status",      value:trip.status },
            ].map(r=>(
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${T.linen}` }}>
                <span style={{ fontFamily:F.sans, fontSize:12, color:T.taupe }}>{r.label}</span>
                <span style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:T.esp }}>{r.value}</span>
              </div>
            ))}
          </Card>
          {totalItems>0 && <Card>
            <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 8px" }}>PACKING PROGRESS</p>
            <ProgressBar value={packedCount} max={totalItems} color={T.gold}/>
            <p style={{ fontFamily:F.sans, fontSize:12, color:T.taupe, margin:"8px 0 0", textAlign:"center" }}>{packedCount}/{totalItems} items packed</p>
          </Card>}
          {trip.plan?.highlights && <Card>
            <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>HIGHLIGHTS</p>
            {trip.plan.highlights.map((h,i)=><div key={i} style={{ display:"flex", gap:10, padding:"6px 0" }}><span style={{ color:T.gold }}>✦</span><p style={{ fontFamily:F.sans, fontSize:13, color:T.esp, margin:0 }}>{h}</p></div>)}
          </Card>}
          {!trip.plan && <Button onClick={()=>generatePlan(trip)} disabled={planning} variant="gold">{planning?<span>✦ Planning...</span>:"✦ Generate Trip Plan"}</Button>}
        </>}

        {tab==="itinerary" && <>
          {trip.plan ? <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><AIBadge label="Planned by Nora"/><button onClick={()=>generatePlan(trip)} style={{ background:"none", border:`1px solid ${T.linen}`, borderRadius:10, padding:"6px 12px", fontFamily:F.sans, fontSize:11, color:T.taupe, cursor:"pointer" }}>↻ Redo</button></div>
            {trip.plan.days.map(d=>(
              <Card key={d.day}>
                <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.gold, margin:"0 0 8px" }}>DAY {d.day} · {d.title}</p>
                {d.activities.map((a,i)=><div key={i} style={{ display:"flex", gap:10, padding:"6px 0" }}><span style={{ color:T.taupe, flexShrink:0 }}>◦</span><p style={{ fontFamily:F.sans, fontSize:13, color:T.esp, margin:0 }}>{a}</p></div>)}
              </Card>
            ))}
            {trip.plan.familyTips?.length>0 && <Card>
              <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>FAMILY TIPS</p>
              {trip.plan.familyTips.map((t,i)=><div key={i} style={{ display:"flex", gap:10, padding:"6px 0" }}><span style={{ color:T.sage }}>✓</span><p style={{ fontFamily:F.sans, fontSize:13, color:T.esp, margin:0 }}>{t}</p></div>)}
            </Card>}
          </> : <Card><p style={{ fontFamily:F.sans, fontSize:14, color:T.taupe, textAlign:"center", padding:"20px 0" }}>Generate your trip plan first in Overview</p></Card>}
        </>}

        {tab==="packing" && <>
          {trip.packingList ? <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><AIBadge label="Packed by Nora"/><button onClick={()=>generatePackingList(trip)} style={{ background:"none", border:`1px solid ${T.linen}`, borderRadius:10, padding:"6px 12px", fontFamily:F.sans, fontSize:11, color:T.taupe, cursor:"pointer" }}>↻ Redo</button></div>
            {(["Everyone","Mum","Kids"] as const).map(cat=>{
              const items = trip.packingList!.filter(i=>i.category===cat);
              if (!items.length) return null;
              return (
                <Card key={cat}>
                  <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>{cat==="Everyone"?"👨‍👩‍👧 Everyone":cat==="Mum"?"👩 Mum":"🧒 Kids"}</p>
                  {items.map(item=>(
                    <div key={item.id} onClick={()=>togglePacking(trip.id,item.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.linen}`, cursor:"pointer", touchAction:"manipulation" }}>
                      <div style={{ width:22, height:22, borderRadius:7, border:`2px solid ${item.done?T.sage:T.linen}`, background:item.done?T.sage:"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13 }}>{item.done?"✓":""}</div>
                      <p style={{ fontFamily:F.sans, fontSize:13, color:item.done?T.taupe:T.esp, margin:0, textDecoration:item.done?"line-through":"none" }}>{item.label}</p>
                    </div>
                  ))}
                </Card>
              );
            })}
          </> : <Button onClick={()=>generatePackingList(trip)} variant="gold">✦ Generate Packing List</Button>}
        </>}
      </div>
    );
  }

  // Trip list view
  return (
    <div style={{ animation:"fadeUp .45s ease both" }}>
      <PageTitle eyebrow="ADVENTURES" title="Trips"/>
      {trips.length>0 && <HeroCard eyebrow="NEXT TRIP" title={trips[0].dest} subtitle={daysUntil(trips[0].date)>0?`${daysUntil(trips[0].date)} days away · ${trips[0].nights} nights`:"Happening now!"} color={T.esp}/>}
      <Button onClick={()=>setShowAdd(!showAdd)} variant="gold" style={{ marginBottom:16 }}>+ Plan a New Trip</Button>

      {showAdd && <Card>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>NEW TRIP</p>
        <Input value={dest} onChange={setDest} placeholder="Destination (e.g. Bali, Paris)" style={{ marginBottom:8 }}/>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:"100%", background:T.sand, border:`1.5px solid ${T.linen}`, borderRadius:12, padding:"12px 14px", fontFamily:F.sans, fontSize:16, color:T.esp, outline:"none", marginBottom:8, boxSizing:"border-box", minHeight:48 }}/>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          <Input value={nights} onChange={setNights} placeholder="Nights" type="number"/>
          <Input value={budget} onChange={setBudget} placeholder="Budget £" type="number"/>
          <Input value={travellers} onChange={setTravellers} placeholder="People" type="number"/>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Button onClick={addTrip} disabled={!dest||!date} variant="gold" style={{ flex:1 }}>Add Trip</Button>
          <Button onClick={()=>setShowAdd(false)} variant="ghost" style={{ flex:1 }}>Cancel</Button>
        </div>
      </Card>}

      {trips.length===0 && !showAdd && <Card><p style={{ fontFamily:F.sans, fontSize:14, color:T.taupe, textAlign:"center", padding:"20px 0", lineHeight:1.6 }}>No trips planned yet.<br/>Add your next adventure above!</p></Card>}

      {trips.map(t=>(
        <div key={t.id} onClick={()=>{ setActiveTrip(t); setTab("overview"); }} style={{ display:"flex", gap:14, padding:"16px", background:T.ivory, borderRadius:20, border:`1px solid ${T.linen}`, marginBottom:10, cursor:"pointer", touchAction:"manipulation" }}>
          <div style={{ width:48, height:48, borderRadius:14, background:`linear-gradient(135deg,${T.gold},#8B6914)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>✈️</div>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:F.serif, fontSize:18, fontStyle:"italic", color:T.esp, margin:"0 0 4px" }}>{t.dest}</p>
            <p style={{ fontFamily:F.sans, fontSize:11, color:T.taupe, margin:0 }}>{t.nights} nights · {new Date(t.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
            <span style={{ background:T.goldP, color:T.gold, fontFamily:F.sans, fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20 }}>{daysUntil(t.date)>0?`${daysUntil(t.date)}d`:"Now"}</span>
            <span style={{ fontFamily:F.sans, fontSize:10, color:T.taupe }}>{t.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
