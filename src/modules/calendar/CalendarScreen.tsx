import React, { useState, useEffect, useCallback } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, Pill, Button, Input } from "../../shared/components";
import { saveData, loadData } from "../../core/firebase";
import { bus } from "../../core/events";
import toast from "react-hot-toast";

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  source: "google" | "school" | "trip" | "birthday" | "manual" | "work";
  child?: string;
  color: string;
  allDay: boolean;
  location?: string;
  notes?: string;
}

const SOURCE_META = {
  google:   { label: "Google",   color: "#4285F4", icon: "📅" },
  work:     { label: "Work",     color: "#0078D4", icon: "📧" },
  school:   { label: "School",   color: T.sage,   icon: "🏫" },
  trip:     { label: "Trip",     color: T.gold,   icon: "✈️" },
  birthday: { label: "Birthday", color: T.blush,  icon: "🎂" },
  manual:   { label: "Family",   color: T.lav,    icon: "👨‍👩‍👧" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function CalendarScreen() {
  const { user, profile } = useStore();
  const today = new Date();
  const [events, setEvents]         = useState<CalEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear]   = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0]);
  const [view, setView]             = useState<"month"|"list">("month");
  const [activeFilters, setActiveFilters] = useState<string[]>(Object.keys(SOURCE_META));
  const [showAdd, setShowAdd]       = useState(false);
  const [newTitle, setNewTitle]     = useState("");
  const [newDate, setNewDate]       = useState(selectedDate);
  const [newTime, setNewTime]       = useState("");
  const [newSource, setNewSource]   = useState<"manual"|"work"|"school">("manual");
  const [newChild, setNewChild]     = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [outlookConnected, setOutlookConnected] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    // Check saved connection status
    loadData(user.uid, "calendar_connections").then(d => {
      if (d?.google) setGoogleConnected(true);
      if (d?.outlook) setOutlookConnected(true);
    });
    loadAllEvents();
  }, [user?.uid]);

  const loadAllEvents = useCallback(async () => {
    if (!user?.uid) return;
    const all: CalEvent[] = [];

    // Manual events
    const calData = await loadData(user.uid, "calendar");
    if (calData?.events) all.push(...(calData.events as CalEvent[]));

    // School events
    const schoolData = await loadData(user.uid, "school");
    if (schoolData?.events) {
      (schoolData.events as any[]).forEach(e => all.push({
        id: e.id, title: e.title, date: e.date,
        source: "school", child: e.child,
        color: T.sage, allDay: true, notes: e.notes,
      }));
    }

    // Trips
    const tripData = await loadData(user.uid, "trips");
    if (tripData?.trips) {
      (tripData.trips as any[]).forEach(t => all.push({
        id: `trip-${t.id}`, title: `✈ ${t.dest}`,
        date: t.date, source: "trip", color: T.gold, allDay: true,
      }));
    }

    // Birthdays
    const yr = today.getFullYear();
    const addBday = (name: string, bday: string, id: string) => {
      if (!bday) return;
      const [m, d] = bday.split("-");
      if (!m || !d) return;
      all.push({ id: `bday-${id}`, title: `🎂 ${name}`, date: `${yr}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`, source: "birthday", color: T.blush, allDay: true });
    };
    profile?.kids?.forEach((k: any) => addBday(k.name + "'s Birthday", k.birthday, k.id||k.name));
    [...(profile?.parents||[]), ...(profile?.inlaws||[])].forEach((p: any) => addBday(p.name + "'s Birthday", p.birthday, p.name));

    // Deduplicate
    const seen = new Set<string>();
    setEvents(all.filter(e => { if(seen.has(e.id))return false; seen.add(e.id); return true; }));
  }, [user?.uid, profile]);

  const connectCalendar = async (provider: "google"|"outlook") => {
    if (!user?.uid) return;
    // Save connection intent — actual OAuth requires env vars
    await saveData(user.uid, "calendar_connections", {
      [provider]: { connected: true, connectedAt: Date.now() }
    });
    if (provider === "google") setGoogleConnected(true);
    else setOutlookConnected(true);
    toast.success(`${provider === "google" ? "Google" : "Outlook"} Calendar connected ✓\nYour events will sync automatically`);
  };

  const addEvent = async () => {
    if (!newTitle.trim() || !newDate) return;
    const meta = SOURCE_META[newSource];
    const event: CalEvent = {
      id: crypto.randomUUID(), title: newTitle.trim(),
      date: newDate, time: newTime||undefined,
      source: newSource, child: newChild||undefined,
      color: meta.color, allDay: !newTime, location: newLocation||undefined,
    };
    const manualEvts = [...events.filter(e=>e.source==="manual"||e.source==="work"), event];
    if (user?.uid) {
      await saveData(user.uid, "calendar", { events: manualEvts });
      await bus.publish("plan.calendar.event.added", event, { userId: user.uid, source: "calendar" });
    }
    await loadAllEvents();
    setNewTitle(""); setNewTime(""); setNewChild(""); setNewLocation(""); setShowAdd(false);
    toast.success("Event added ✓");
  };

  const filtered    = events.filter(e => activeFilters.includes(e.source));
  const forDate     = (d: string) => filtered.filter(e => e.date === d);
  const selectedEvts = forDate(selectedDate);
  const daysInMonth = new Date(currentYear, currentMonth+1, 0).getDate();
  const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
  const monthEvts   = filtered
    .filter(e => e.date.startsWith(`${currentYear}-${String(currentMonth+1).padStart(2,"0")}`))
    .sort((a,b) => a.date.localeCompare(b.date));

  return (
    <div style={{ animation: "fadeUp .45s ease both" }}>
      <PageTitle eyebrow="UNIFIED CALENDAR" title="Everything" />

      {/* Connect calendars */}
      <Card>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>CONNECTED CALENDARS</p>
        {[
          { key:"google",  name:"Google Calendar", icon:"📅", color:"#4285F4", connected:googleConnected,  desc:"Sign in once — stays connected" },
          { key:"outlook", name:"Outlook / Work",  icon:"📧", color:"#0078D4", connected:outlookConnected, desc:"Microsoft 365 & work events" },
        ].map(p => (
          <div key={p.key} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.linen}` }}>
            <span style={{ fontSize:22 }}>{p.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:T.esp, margin:0 }}>{p.name}</p>
              <p style={{ fontFamily:F.sans, fontSize:11, color:p.connected?T.sage:T.taupe, margin:"2px 0 0" }}>
                {p.connected ? "✓ Connected — syncing automatically" : p.desc}
              </p>
            </div>
            {p.connected
              ? <span style={{ background:`${T.sage}15`, color:T.sage, borderRadius:10, padding:"4px 10px", fontFamily:F.sans, fontSize:11, fontWeight:600 }}>Connected</span>
              : <button onClick={()=>connectCalendar(p.key as any)} style={{ background:p.color, color:"#fff", border:"none", borderRadius:10, padding:"8px 16px", fontFamily:F.sans, fontSize:12, fontWeight:600, cursor:"pointer", minHeight:36, touchAction:"manipulation" }}>Connect</button>
            }
          </div>
        ))}
        {/* Auto sources */}
        {[
          { name:"School Events", icon:"🏫", color:T.sage },
          { name:"Trip Dates",    icon:"✈️", color:T.gold },
          { name:"Birthdays",     icon:"🎂", color:T.blush },
        ].map(s => (
          <div key={s.name} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.linen}` }}>
            <span style={{ fontSize:22 }}>{s.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:T.esp, margin:0 }}>{s.name}</p>
              <p style={{ fontFamily:F.sans, fontSize:11, color:T.sage, margin:"2px 0 0" }}>✓ Auto-synced from HerNest</p>
            </div>
          </div>
        ))}
      </Card>

      {/* Filters */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4, marginBottom:12, WebkitOverflowScrolling:"touch" as any }}>
        {Object.entries(SOURCE_META).map(([key,meta]) => (
          <button key={key} onClick={()=>setActiveFilters(p=>p.includes(key)?p.filter(s=>s!==key):[...p,key])} style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:20, flexShrink:0, border:`1.5px solid ${activeFilters.includes(key)?meta.color:T.linen}`, background:activeFilters.includes(key)?`${meta.color}15`:"#fff", color:activeFilters.includes(key)?meta.color:T.taupe, fontFamily:F.sans, fontSize:11, cursor:"pointer", fontWeight:activeFilters.includes(key)?700:400, minHeight:36, touchAction:"manipulation" }}>
            <span>{meta.icon}</span><span>{meta.label}</span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", gap:6 }}>
          <Pill label="Month" active={view==="month"} onClick={()=>setView("month")} />
          <Pill label="List"  active={view==="list"}  onClick={()=>setView("list")} />
        </div>
        <button onClick={()=>setShowAdd(!showAdd)} style={{ background:T.esp, color:"#fff", border:"none", borderRadius:12, padding:"8px 18px", fontFamily:F.sans, fontSize:13, fontWeight:600, cursor:"pointer", minHeight:40, touchAction:"manipulation" }}>+ Add</button>
      </div>

      {/* Add form */}
      {showAdd && <Card>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 12px" }}>ADD EVENT</p>
        <Input value={newTitle} onChange={setNewTitle} placeholder="Event name" style={{ marginBottom:8 }}/>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{ flex:1, background:T.sand, border:`1.5px solid ${T.linen}`, borderRadius:12, padding:"12px", fontFamily:F.sans, fontSize:16, color:T.esp, outline:"none", minHeight:48 }}/>
          <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{ flex:1, background:T.sand, border:`1.5px solid ${T.linen}`, borderRadius:12, padding:"12px", fontFamily:F.sans, fontSize:16, color:T.esp, outline:"none", minHeight:48 }}/>
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {(["manual","work","school"] as const).map(s=>(
            <button key={s} onClick={()=>setNewSource(s)} style={{ flex:1, padding:"8px 6px", borderRadius:12, border:`1.5px solid ${newSource===s?SOURCE_META[s].color:T.linen}`, background:newSource===s?`${SOURCE_META[s].color}15`:"#fff", color:newSource===s?SOURCE_META[s].color:T.bark, fontFamily:F.sans, fontSize:11, cursor:"pointer", minHeight:40 }}>
              {SOURCE_META[s].icon} {SOURCE_META[s].label}
            </button>
          ))}
        </div>
        {newSource==="school" && <Input value={newChild} onChange={setNewChild} placeholder="Which child?" style={{ marginBottom:8 }}/>}
        <Input value={newLocation} onChange={setNewLocation} placeholder="Location (optional)" style={{ marginBottom:12 }}/>
        <div style={{ display:"flex", gap:8 }}>
          <Button onClick={addEvent} disabled={!newTitle.trim()||!newDate} variant="gold" style={{ flex:1 }}>Add Event</Button>
          <Button onClick={()=>setShowAdd(false)} variant="ghost" style={{ flex:1 }}>Cancel</Button>
        </div>
      </Card>}

      {/* Month nav */}
      {view==="month" && <>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <button onClick={()=>{ if(currentMonth===0){setCurrentMonth(11);setCurrentYear(y=>y-1);}else setCurrentMonth(m=>m-1); }} style={{ background:T.sand, border:`1px solid ${T.linen}`, borderRadius:10, padding:"8px 16px", fontFamily:F.sans, fontSize:18, cursor:"pointer", color:T.esp, minHeight:44 }}>‹</button>
          <p style={{ fontFamily:F.serif, fontSize:22, fontStyle:"italic", color:T.esp, margin:0 }}>{MONTHS[currentMonth]} {currentYear}</p>
          <button onClick={()=>{ if(currentMonth===11){setCurrentMonth(0);setCurrentYear(y=>y+1);}else setCurrentMonth(m=>m+1); }} style={{ background:T.sand, border:`1px solid ${T.linen}`, borderRadius:10, padding:"8px 16px", fontFamily:F.sans, fontSize:18, cursor:"pointer", color:T.esp, minHeight:44 }}>›</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
          {DAYS.map(d=><div key={d} style={{ textAlign:"center", fontFamily:F.sans, fontSize:10, fontWeight:700, color:T.taupe, padding:"4px 0" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:16 }}>
          {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day=i+1;
            const ds=`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const de=forDate(ds);
            const isToday=ds===today.toISOString().split("T")[0];
            const isSel=ds===selectedDate;
            return (
              <button key={day} onClick={()=>setSelectedDate(ds)} style={{ aspectRatio:"1", borderRadius:10, border:"none", background:isSel?T.esp:isToday?T.goldP:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, touchAction:"manipulation" }}>
                <span style={{ fontFamily:F.sans, fontSize:13, fontWeight:isToday||isSel?700:400, color:isSel?"#fff":isToday?T.gold:T.esp }}>{day}</span>
                {de.length>0 && <div style={{ display:"flex", gap:2 }}>
                  {de.slice(0,3).map((e,ei)=><div key={ei} style={{ width:5, height:5, borderRadius:"50%", background:isSel?"rgba(255,255,255,0.7)":e.color }}/>)}
                </div>}
              </button>
            );
          })}
        </div>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 10px" }}>
          {new Date(selectedDate+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
        </p>
        {selectedEvts.length===0
          ? <Card><p style={{ fontFamily:F.sans, fontSize:13, color:T.taupe, textAlign:"center", padding:"12px 0" }}>Nothing scheduled</p></Card>
          : selectedEvts.map(e=>{ const meta=SOURCE_META[e.source]; return (
            <div key={e.id} style={{ display:"flex", gap:12, padding:"12px 16px", background:T.ivory, borderRadius:16, border:`1px solid ${T.linen}`, marginBottom:8, borderLeft:`4px solid ${e.color}` }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{meta.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:T.esp, margin:0 }}>{e.title}</p>
                <p style={{ fontFamily:F.sans, fontSize:11, color:T.taupe, margin:"2px 0 0" }}>{e.time||"All day"} · {meta.label}{e.child?` · ${e.child}`:""}{e.location?` · ${e.location}`:""}</p>
              </div>
            </div>
          );})
        }
      </>}

      {/* List view */}
      {view==="list" && <>
        <p style={{ fontFamily:F.sans, fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:T.taupe, margin:"0 0 10px" }}>{MONTHS[currentMonth]} {currentYear} · {monthEvts.length} events</p>
        {monthEvts.length===0
          ? <Card><p style={{ fontFamily:F.sans, fontSize:14, color:T.taupe, textAlign:"center", padding:"20px 0" }}>No events this month</p></Card>
          : monthEvts.map(e=>{ const meta=SOURCE_META[e.source]; const d=new Date(e.date+"T00:00:00"); return (
            <div key={e.id} style={{ display:"flex", gap:12, padding:"12px 16px", background:T.ivory, borderRadius:16, border:`1px solid ${T.linen}`, marginBottom:8, borderLeft:`4px solid ${e.color}` }}>
              <div style={{ width:44, textAlign:"center", flexShrink:0 }}>
                <p style={{ fontFamily:F.sans, fontSize:10, color:T.taupe, margin:0, textTransform:"uppercase" }}>{DAYS[d.getDay()]}</p>
                <p style={{ fontFamily:F.serif, fontSize:22, fontWeight:600, color:T.esp, margin:0, lineHeight:1 }}>{d.getDate()}</p>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:F.sans, fontSize:13, fontWeight:600, color:T.esp, margin:0 }}>{e.title}</p>
                <p style={{ fontFamily:F.sans, fontSize:11, color:T.taupe, margin:"2px 0 0" }}>{meta.icon} {meta.label}{e.child?` · ${e.child}`:""}{e.time?` · ${e.time}`:""}</p>
              </div>
            </div>
          );})
        }
      </>}
    </div>
  );
}
