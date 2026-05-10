import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, HeroCard, Button, Input } from "../../shared/components";

interface Contact { id:string; name:string; relationship:string; birthday?:string; lastContact?:string; }

export function CircleScreen() {
  const { profile } = useStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState(""); const [rel, setRel] = useState("Friend");

  const add = () => {
    if(!name.trim())return;
    setContacts(p=>[...p,{id:crypto.randomUUID(),name:name.trim(),relationship:rel}]);
    setName("");
  };

  const daysSince = (date?:string) => date ? Math.floor((Date.now()-new Date(date).getTime())/(1000*60*60*24)) : null;

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="RELATIONSHIPS" title="My Circle"/>
      <HeroCard eyebrow="NORA SAYS" title="Your people need you" subtitle="Nora tracks who's due for a check-in"/>
      <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>ADD SOMEONE</p>
        <Input value={name} onChange={setName} placeholder="Name" style={{marginBottom:8}}/>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {["Friend","Family","Partner","Colleague"].map(r=><button key={r} onClick={()=>setRel(r)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${rel===r?T.esp:T.linen}`,background:rel===r?T.esp:"#fff",color:rel===r?"#fff":T.bark,fontFamily:F.sans,fontSize:11,cursor:"pointer"}}>{r}</button>)}
        </div>
        <Button onClick={add} disabled={!name.trim()} variant="secondary">Add to Circle</Button>
      </Card>
      {profile?.kids?.map((k:any)=>({ id:k.id||k.name, name:k.name, relationship:"Child" })).concat(contacts).map((c:Contact)=>(
        <Card key={c.id}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:T.goldP,border:`2px solid ${T.gold}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:F.serif,fontSize:18,color:T.gold}}>{c.name[0]}</div>
            <div style={{flex:1}}>
              <p style={{fontFamily:F.sans,fontSize:14,fontWeight:600,color:T.esp,margin:0}}>{c.name}</p>
              <p style={{fontFamily:F.sans,fontSize:11,color:T.taupe,margin:"2px 0 0",textTransform:"uppercase",letterSpacing:"0.08em"}}>{c.relationship}</p>
            </div>
            <button style={{background:T.sand,border:`1px solid ${T.linen}`,borderRadius:10,padding:"6px 12px",fontFamily:F.sans,fontSize:11,color:T.bark,cursor:"pointer"}}>Check in</button>
          </div>
        </Card>
      ))}
    </div>
  );
}