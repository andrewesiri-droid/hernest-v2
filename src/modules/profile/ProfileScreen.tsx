import React, { useState } from "react";
import { T, F } from "../../config/theme";
import { useStore } from "../../core/store";
import { Card, PageTitle, Button, Input } from "../../shared/components";
import { saveData } from "../../core/firebase";
import { signOut } from "firebase/auth";
import { auth } from "../../core/firebase";
import toast from "react-hot-toast";

export function ProfileScreen() {
  const { user, profile, updateProfile, reset } = useStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name||"");
  const [city, setCity] = useState(profile?.city||"");
  const [role, setRole] = useState(profile?.role||"");
  const [challenge, setChallenge] = useState(profile?.challenge||"");

  const save = async () => {
    updateProfile({ name, city, role, challenge });
    if (user?.uid) await saveData(user.uid, "profile", { ...profile, name, city, role, challenge });
    setEditing(false);
    toast.success("Profile saved ✓");
  };

  const handleSignOut = async () => {
    await signOut(auth);
    reset();
  };

  return (
    <div style={{animation:"fadeUp .45s ease both"}}>
      <PageTitle eyebrow="YOUR ACCOUNT" title="Profile"/>
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
          <div style={{width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},#8B6914)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{profile?.avatar||"👩"}</div>
          <div>
            <h2 style={{fontFamily:F.serif,fontSize:22,fontStyle:"italic",color:T.esp,margin:0}}>{profile?.name||"Your name"}</h2>
            <p style={{fontFamily:F.sans,fontSize:12,color:T.taupe,margin:"2px 0 0"}}>{user?.email}</p>
          </div>
        </div>
        {editing ? <>
          <Input value={name} onChange={setName} placeholder="Your name" style={{marginBottom:8}}/>
          <Input value={city} onChange={setCity} placeholder="City" style={{marginBottom:8}}/>
          <Input value={role} onChange={setRole} placeholder="Your role / job title" style={{marginBottom:8}}/>
          <Input value={challenge} onChange={setChallenge} placeholder="Biggest challenge right now" style={{marginBottom:12}}/>
          <div style={{display:"flex",gap:8}}>
            <Button onClick={save} variant="gold" style={{flex:1}}>Save</Button>
            <Button onClick={()=>setEditing(false)} variant="ghost" style={{flex:1}}>Cancel</Button>
          </div>
        </> : <Button onClick={()=>setEditing(true)} variant="secondary">Edit Profile</Button>}
      </Card>
      <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>YOUR FAMILY</p>
        {profile?.kids?.length ? profile.kids.map((k:any,i:number)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.linen}`}}>
            <span style={{fontSize:20}}>👧</span>
            <div><p style={{fontFamily:F.sans,fontSize:13,color:T.esp,margin:0}}>{k.name}</p><p style={{fontFamily:F.sans,fontSize:11,color:T.taupe,margin:0}}>Age {k.age}</p></div>
          </div>
        )) : <p style={{fontFamily:F.sans,fontSize:13,color:T.taupe}}>Add your kids in Profile settings</p>}
      </Card>
      <Card>
        <p style={{fontFamily:F.sans,fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:T.taupe,margin:"0 0 12px"}}>NORA'S MEMORY</p>
        <p style={{fontFamily:F.sans,fontSize:13,color:T.esp,lineHeight:1.6}}>Nora remembers your preferences, family details, and patterns from your conversations. Chat with Nora to help her learn more about you.</p>
      </Card>
      <Button onClick={handleSignOut} variant="ghost" style={{marginTop:8,color:T.taupe}}>Sign out</Button>
    </div>
  );
}