/**
 * pages/Settings.jsx
 * Tabbed settings: General | Users | Account | Notifications | Activity Log
 */

import { useState, useEffect } from "react";
import { useTheme } from "../ThemeProvider.jsx";
import { F } from "../tokens.js";
import { auth as authApi } from "../api.js";
import { usePermissions, ALL_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from "../usePermissions.js";

const BASE = "http://localhost:3001/api";

async function settingsFetch(path, opts = {}) {
  const token = sessionStorage.getItem("rr-admin-token");
  const res   = await fetch(`${BASE}/settings${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Failed: ${res.status}`);
  }
  return res.json();
}

function Row({ label, hint, children, C }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:16, padding:"1rem 0", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
      <div style={{ minWidth:180 }}>
        <div style={{ fontFamily:F.body, fontSize:C.fontSize, fontWeight:500, color:C.textPrimary, marginBottom:hint?3:0 }}>{label}</div>
        {hint && <div style={{ fontFamily:F.body, fontSize:C.fontSizeSm-1, color:C.textDim, fontWeight:300 }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Card({ title, children, C }) {
  return (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:3, marginBottom:18, transition:"background 0.3s" }}>
      {title && (
        <div style={{ padding:"1rem 1.5rem", borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:F.display, fontSize:"1.05rem", fontWeight:500, color:C.textPrimary, margin:0 }}>{title}</h3>
        </div>
      )}
      <div style={{ padding:"0 1.5rem 1rem" }}>{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, C }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width:40, height:22, borderRadius:11, background:on?C.blue:C.border, position:"relative", cursor:"pointer", transition:"background 0.25s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?21:3, width:16, height:16, borderRadius:"50%", background:C.white, transition:"left 0.25s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );
}

function Btn({ children, onClick, variant="primary", disabled=false, small=false, C }) {
  const bg = variant==="primary"?C.blue:variant==="danger"?C.danger:"transparent";
  const border = variant==="ghost"?`1px solid ${C.border}`:"none";
  return (
    <button onClick={onClick} disabled={disabled} style={{ background:disabled?"rgba(33,150,196,0.3)":bg, border, borderRadius:2, color:variant==="ghost"?C.textSecondary:"#fff", cursor:disabled?"not-allowed":"pointer", padding:small?"6px 14px":"9px 20px", fontFamily:F.body, fontSize:small?C.fontSizeSm-1:C.fontSizeSm, fontWeight:600, letterSpacing:"0.08em", transition:"all 0.2s", display:"inline-flex", alignItems:"center", gap:6 }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, type="text", placeholder, C }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:2, padding:"9px 12px", color:C.textPrimary, fontSize:C.fontSize, fontFamily:F.body, outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s" }}
      onFocus={e => e.target.style.borderColor=C.blue}
      onBlur={e => e.target.style.borderColor=C.border}
    />
  );
}

function Feedback({ msg, type="success", C }) {
  if (!msg) return null;
  const col = type==="success"?"#1e9160":C.danger;
  return (
    <div style={{ marginTop:10, padding:"8px 12px", borderRadius:2, background:type==="success"?"rgba(30,145,96,0.08)":"rgba(217,79,79,0.08)", border:`1px solid ${type==="success"?"rgba(30,145,96,0.25)":"rgba(217,79,79,0.25)"}`, color:col, fontFamily:F.body, fontSize:C.fontSizeSm, fontWeight:500 }}>
      {msg}
    </div>
  );
}

function RoleBadge({ role, C }) {
  const ROLE_COLORS = {
    ADMIN:   { bg: C.blueDim,                  color: C.blue    },
    MANAGER: { bg: "rgba(30,145,96,0.1)",       color: "#1e9160" },
    FINANCE: { bg: "rgba(130,90,200,0.1)",      color: "#8a5ac8" },
    STAFF:   { bg: "rgba(232,160,32,0.1)",      color: "#e8a020" },
    VIEWER:  { bg: "rgba(138,151,176,0.1)",     color: "#7a8ba8" },
  };
  const col = ROLE_COLORS[role] || ROLE_COLORS.VIEWER;
  return (
    <span style={{ fontSize:9, letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:F.body, fontWeight:700, padding:"2px 8px", borderRadius:10, background:col.bg, color:col.color }}>
      {role}
    </span>
  );
}

function TabGeneral({ C }) {
  const { fontSize, changeFontSize } = useTheme();
  const [apiStatus, setApiStatus] = useState("checking");
  useEffect(() => {
    fetch("http://localhost:3001/api/health")
      .then(r => r.ok?setApiStatus("ok"):setApiStatus("error"))
      .catch(() => setApiStatus("error"));
  }, []);
  const SIZES = [{label:"Small",value:12},{label:"Medium",value:14},{label:"Large",value:16}];
  return (
    <>
      <Card C={C} title="Business Information">
        {[["Business Name","Refined Rentals (PTY) LTD"],["Primary Phone","+266 6363 0598"],["Secondary Phone","+266 5885 8114"],["Email","refinedrentals.lso@gmail.com"],["Facebook","Refined Rentals"],["Coverage Area","Lesotho-wide"]].map(([l,v]) => (
          <Row key={l} label={l} C={C}><span style={{ fontFamily:F.body, fontSize:C.fontSize, color:C.textSecondary, fontWeight:300 }}>{v}</span></Row>
        ))}
      </Card>
      <Card C={C} title="Appearance">
        <Row label="Font Size" hint="Adjusts text size across the entire dashboard" C={C}>
          <div style={{ display:"flex", gap:6 }}>
            {SIZES.map(fs => (
              <button key={fs.value} onClick={() => changeFontSize(fs.value)} style={{ padding:"6px 14px", borderRadius:2, border:`1px solid ${fontSize===fs.value?C.blue:C.border}`, background:fontSize===fs.value?C.blueDim:"transparent", color:fontSize===fs.value?C.blue:C.textSecondary, fontFamily:F.body, fontSize:C.fontSizeSm, fontWeight:fontSize===fs.value?600:400, cursor:"pointer", transition:"all 0.2s" }}>
                {fs.label}
              </button>
            ))}
          </div>
        </Row>
      </Card>
      <Card C={C} title="System Status">
        <Row label="API Server" hint="localhost:3001" C={C}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:apiStatus==="ok"?"#1e9160":apiStatus==="error"?C.danger:"#e8a020" }} />
            <span style={{ fontFamily:F.body, fontSize:C.fontSizeSm, color:apiStatus==="ok"?"#1e9160":apiStatus==="error"?C.danger:"#e8a020", fontWeight:500 }}>
              {apiStatus==="ok"?"Connected":apiStatus==="error"?"Unreachable":"Checking..."}
            </span>
          </div>
        </Row>
        {[["Database","PostgreSQL 18.1 (local)","Supabase migration planned"],["Auth","JWT via sessionStorage","httpOnly cookies on production"],["File Storage","Local: /backend/uploads","Supabase Storage planned"],["Email Sending","Not yet configured","Phase 5: EmailJS or Resend"]].map(([l,v,h]) => (
          <Row key={l} label={l} hint={h} C={C}><span style={{ fontFamily:F.body, fontSize:C.fontSize, color:C.textSecondary, fontWeight:300 }}>{v}</span></Row>
        ))}
      </Card>
    </>
  );
}

function TabUsers({ currentAdminId, C }) {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [newEmail,setNewEmail]=useState("");
  const [newPass,setNewPass]=useState("");
  const [newRole,setNewRole]=useState("VIEWER");
  const [resetId,setResetId]=useState(null);
  const [resetPass,setResetPass]=useState("");
  const [fb,setFb]=useState({msg:"",type:"success"});
  const flash=(msg,type="success")=>{setFb({msg,type});setTimeout(()=>setFb({msg:"",type:"success"}),4000);};
  const load=()=>settingsFetch("/users").then(d=>{setUsers(d.users);setLoading(false);}).catch(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const createUser=async()=>{
    try{await settingsFetch("/users",{method:"POST",body:JSON.stringify({email:newEmail,password:newPass,role:newRole})});flash(`User ${newEmail} created`);setNewEmail("");setNewPass("");setNewRole("VIEWER");setShowCreate(false);load();}
    catch(err){flash(err.message,"error");}
  };
  const changeRole=async(id,role)=>{
    try{await settingsFetch(`/users/${id}/role`,{method:"PATCH",body:JSON.stringify({role})});flash("Role updated");load();}
    catch(err){flash(err.message,"error");}
  };
  const resetPassword=async(id)=>{
    if(!resetPass)return;
    try{await settingsFetch(`/users/${id}/password`,{method:"PATCH",body:JSON.stringify({password:resetPass})});flash("Password reset");setResetId(null);setResetPass("");}
    catch(err){flash(err.message,"error");}
  };
  const removeUser=async(id,email)=>{
    if(!confirm(`Remove ${email}? This cannot be undone.`))return;
    try{await settingsFetch(`/users/${id}`,{method:"DELETE"});flash(`${email} removed`);load();}
    catch(err){flash(err.message,"error");}
  };
  return (
    <>
      <Feedback msg={fb.msg} type={fb.type} C={C} />
      <Card C={C} title="Admin Users">
        {loading?<p style={{padding:"1rem 0",color:C.textDim,fontFamily:F.body,fontSize:C.fontSize}}>Loading...</p>:(
          <>
            {users.map(u=>(
              <div key={u.id} style={{padding:"1rem 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:C.blueDim,border:`1px solid ${C.borderBlue}`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F.display,fontSize:14,fontWeight:600,color:C.blue,flexShrink:0}}>
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontFamily:F.body,fontSize:C.fontSize,fontWeight:500,color:C.textPrimary,display:"flex",alignItems:"center",gap:8}}>
                        {u.email}{u.id===currentAdminId&&<span style={{fontSize:9,color:C.textDim,fontFamily:F.body}}>(you)</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}>
                        <RoleBadge role={u.role} C={C}/>
                        <span style={{fontSize:C.fontSizeSm-1,color:C.textDim,fontFamily:F.body}}>Since {new Date(u.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>
                      </div>
                    </div>
                  </div>
                  {u.id!==currentAdminId&&(
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      <select value={u.role} onChange={e=>changeRole(u.id,e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"6px 10px",color:C.textPrimary,fontFamily:F.body,fontSize:C.fontSizeSm,cursor:"pointer",outline:"none"}}>
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="FINANCE">Finance</option>
                        <option value="STAFF">Staff</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      {resetId===u.id?(
                        <div style={{display:"flex",gap:6,alignItems:"center"}}>
                          <input type="password" placeholder="New password" value={resetPass} onChange={e=>setResetPass(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"6px 10px",color:C.textPrimary,fontFamily:F.body,fontSize:C.fontSizeSm,outline:"none",width:140}}/>
                          <Btn small C={C} onClick={()=>resetPassword(u.id)}>Save</Btn>
                          <Btn small C={C} variant="ghost" onClick={()=>{setResetId(null);setResetPass("");}}>Cancel</Btn>
                        </div>
                      ):(
                        <Btn small C={C} variant="ghost" onClick={()=>setResetId(u.id)}>Reset Password</Btn>
                      )}
                      <Btn small C={C} variant="danger" onClick={()=>removeUser(u.id,u.email)}>Remove</Btn>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {showCreate?(
              <div style={{marginTop:"1rem",padding:"1.25rem",background:C.bg,borderRadius:2,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontFamily:F.display,fontSize:"1rem",fontWeight:600,color:C.textPrimary,marginBottom:4}}>New User</div>
                <Input C={C} value={newEmail} onChange={setNewEmail} placeholder="Email address"/>
                <Input C={C} value={newPass} onChange={setNewPass} type="password" placeholder="Default password (min 8 characters)"/>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <label style={{fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textSecondary}}>Role:</label>
                  <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:2,padding:"7px 12px",color:C.textPrimary,fontFamily:F.body,fontSize:C.fontSizeSm,cursor:"pointer",outline:"none"}}>
                    <option value="ADMIN">Admin: full access</option>
                    <option value="MANAGER">Manager: operational access, no user management</option>
                    <option value="FINANCE">Finance: quotes and pricing only</option>
                    <option value="STAFF">Staff: view, review and notes only</option>
                    <option value="VIEWER">Viewer: read only</option>
                  </select>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn C={C} onClick={createUser}>Create User</Btn>
                  <Btn C={C} variant="ghost" onClick={()=>{setShowCreate(false);setNewEmail("");setNewPass("");setNewRole("VIEWER");}}>Cancel</Btn>
                </div>
              </div>
            ):(
              <div style={{paddingTop:"1rem"}}>
                <Btn C={C} onClick={()=>setShowCreate(true)}><span style={{fontSize:16,lineHeight:1}}>+</span> Add User</Btn>
              </div>
            )}
          </>
        )}
      </Card>
      <Card C={C} title="Role Permissions">
        {[
          ["ADMIN",   "Full access, including user management and system settings"],
          ["MANAGER", "Full operational access: quotes, gallery, announcements, activity log"],
          ["FINANCE", "Quote and pricing focused: build, send, revise and close quotes"],
          ["STAFF",   "Frontline: view requests, set In Review, add internal notes"],
          ["VIEWER",  "Read only: cannot make any changes"],
        ].map(([role, desc]) => (
          <Row key={role} label={<RoleBadge role={role} C={C}/>} C={C}>
            <span style={{fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textSecondary,fontWeight:300,maxWidth:400,textAlign:"right"}}>{desc}</span>
          </Row>
        ))}
      </Card>
    </>
  );
}

function TabAccount({ adminEmail, C }) {
  const [current,setCurrent]=useState("");
  const [newPass,setNewPass]=useState("");
  const [confirm,setConfirm]=useState("");
  const [saving,setSaving]=useState(false);
  const [fb,setFb]=useState({msg:"",type:"success"});
  const flash=(msg,type="success")=>{setFb({msg,type});setTimeout(()=>setFb({msg:"",type:"success"}),4000);};
  const save=async()=>{
    if(!current||!newPass||!confirm)return flash("All fields are required","error");
    if(newPass!==confirm)return flash("New passwords do not match","error");
    if(newPass.length<8)return flash("New password must be at least 8 characters","error");
    setSaving(true);
    try{
      await settingsFetch("/account/password",{method:"PATCH",body:JSON.stringify({currentPassword:current,newPassword:newPass})});
      flash("Password updated successfully");setCurrent("");setNewPass("");setConfirm("");
    }catch(err){flash(err.message,"error");}
    finally{setSaving(false);}
  };
  return (
    <>
      <Card C={C} title="Your Account">
        <Row label="Email" hint="Contact your system administrator to change your email" C={C}>
          <span style={{fontFamily:F.body,fontSize:C.fontSize,color:C.textSecondary}}>{adminEmail}</span>
        </Row>
      </Card>
      <Card C={C} title="Change Password">
        <div style={{display:"flex",flexDirection:"column",gap:12,paddingTop:"0.75rem"}}>
          {[["Current Password",current,setCurrent,"Enter your current password"],["New Password",newPass,setNewPass,"At least 8 characters"],["Confirm New Password",confirm,setConfirm,"Repeat new password"]].map(([label,val,set,ph])=>(
            <div key={label}>
              <label style={{display:"block",fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textDim,marginBottom:6}}>{label}</label>
              <Input C={C} type="password" value={val} onChange={set} placeholder={ph}/>
            </div>
          ))}
          <Feedback msg={fb.msg} type={fb.type} C={C}/>
          <div><Btn C={C} onClick={save} disabled={saving}>{saving?"Saving...":"Update Password"}</Btn></div>
        </div>
      </Card>
    </>
  );
}

function TabNotifications({ C }) {
  const [emails,setEmails]=useState([]);
  const [newEmail,setNewEmail]=useState("");
  const [newLabel,setNewLabel]=useState("");
  const [loading,setLoading]=useState(true);
  const [fb,setFb]=useState({msg:"",type:"success"});
  const flash=(msg,type="success")=>{setFb({msg,type});setTimeout(()=>setFb({msg:"",type:"success"}),4000);};
  const load=()=>settingsFetch("/notifications").then(d=>{setEmails(d.emails);setLoading(false);}).catch(()=>setLoading(false));
  useEffect(()=>{load();},[]);
  const add=async()=>{
    if(!newEmail)return;
    try{await settingsFetch("/notifications",{method:"POST",body:JSON.stringify({email:newEmail,label:newLabel})});flash(`${newEmail} added`);setNewEmail("");setNewLabel("");load();}
    catch(err){flash(err.message,"error");}
  };
  const toggle=async(id,active)=>{
    try{await settingsFetch(`/notifications/${id}`,{method:"PATCH",body:JSON.stringify({active:!active})});load();}
    catch(err){flash(err.message,"error");}
  };
  const remove=async(id,email)=>{
    try{await settingsFetch(`/notifications/${id}`,{method:"DELETE"});flash(`${email} removed`);load();}
    catch(err){flash(err.message,"error");}
  };
  return (
    <>
      <Feedback msg={fb.msg} type={fb.type} C={C}/>
      <Card C={C} title="Quote Notification Emails">
        <p style={{margin:"0.75rem 0",fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textDim,lineHeight:1.65}}>
          When a new quote request comes in, a notification will be sent to these addresses in addition to the main business email.
        </p>
        {loading?<p style={{color:C.textDim,fontFamily:F.body,fontSize:C.fontSize}}>Loading...</p>
        :emails.length===0?<p style={{color:C.textDim,fontFamily:F.body,fontSize:C.fontSize,padding:"0.5rem 0"}}>No notification emails added yet.</p>
        :emails.map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"0.9rem 0",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
            <div>
              <div style={{fontFamily:F.body,fontSize:C.fontSize,fontWeight:500,color:e.active?C.textPrimary:C.textDim}}>{e.email}</div>
              {e.label&&<div style={{fontFamily:F.body,fontSize:C.fontSizeSm-1,color:C.textDim,marginTop:2}}>{e.label}</div>}
            </div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <Toggle C={C} on={e.active} onChange={()=>toggle(e.id,e.active)}/>
              <Btn small C={C} variant="danger" onClick={()=>remove(e.id,e.email)}>Remove</Btn>
            </div>
          </div>
        ))}
        <div style={{marginTop:"1.25rem",display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:200}}>
            <label style={{display:"block",fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textDim,marginBottom:5}}>Email address</label>
            <Input C={C} value={newEmail} onChange={setNewEmail} placeholder="name@example.com"/>
          </div>
          <div style={{flex:1,minWidth:140}}>
            <label style={{display:"block",fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textDim,marginBottom:5}}>Label (optional)</label>
            <Input C={C} value={newLabel} onChange={setNewLabel} placeholder="e.g. Pitso personal"/>
          </div>
          <Btn C={C} onClick={add}>Add</Btn>
        </div>
      </Card>
    </>
  );
}

const ACTION_LABELS = {
  STATUS_NEW:"Set to New",STATUS_REVIEW:"Set to In Review",STATUS_QUOTED:"Quote Sent",STATUS_CLOSED:"Request Closed",
  QUOTE_SENT:"Quote Built & Sent",CREATE_USER:"Created User",DELETE_USER:"Removed User",CHANGE_ROLE:"Changed Role",
  RESET_PASSWORD:"Reset Password",CHANGE_OWN_PASSWORD:"Changed Own Password",
  ADD_NOTIFICATION_EMAIL:"Added Notification Email",REMOVE_NOTIFICATION_EMAIL:"Removed Notification Email",
};

function ActionBadge({ action, C }) {
  const isQuote=action.startsWith("STATUS_")||action==="QUOTE_SENT";
  const isUser=action.includes("USER")||action.includes("ROLE")||action.includes("PASSWORD");
  const isNotif=action.includes("NOTIFICATION");
  const color=isQuote?C.blue:isUser?"#e8a020":isNotif?"#1e9160":C.textDim;
  const bg=isQuote?C.blueDim:isUser?"rgba(232,160,32,0.1)":isNotif?"rgba(30,145,96,0.1)":C.border;
  return <span style={{fontSize:9,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:F.body,fontWeight:700,padding:"2px 8px",borderRadius:10,background:bg,color,whiteSpace:"nowrap"}}>{ACTION_LABELS[action]||action}</span>;
}

function TabActivityLog({ C }) {
  const [log,setLog]=useState([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(0);
  const LIMIT=20;
  const load=(p=0)=>{
    setLoading(true);
    settingsFetch(`/audit?limit=${LIMIT}&offset=${p*LIMIT}`)
      .then(d=>{setLog(d.log);setTotal(d.total);setLoading(false);})
      .catch(()=>setLoading(false));
  };
  useEffect(()=>{load(0);},[]);
  const go=(dir)=>{const next=page+dir;setPage(next);load(next);};
  const fmtDate=(iso)=>new Date(iso).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  return (
    <Card C={C} title={`Activity Log (${total} entries)`}>
      {loading?<p style={{padding:"1rem 0",color:C.textDim,fontFamily:F.body,fontSize:C.fontSize}}>Loading...</p>
      :log.length===0?<p style={{padding:"1rem 0",color:C.textDim,fontFamily:F.body,fontSize:C.fontSize}}>No activity recorded yet.</p>:(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px 1fr",gap:8,padding:"6px 0",borderBottom:`1px solid ${C.border}`,marginBottom:2}}>
            {["Time","User","Action","Detail"].map(h=>(
              <div key={h} style={{fontSize:8.5,letterSpacing:"0.18em",textTransform:"uppercase",color:C.textDim,fontFamily:F.body}}>{h}</div>
            ))}
          </div>
          {log.map(entry=>(
            <div key={entry.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 120px 1fr",gap:8,padding:"10px 0",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
              <div style={{fontFamily:F.body,fontSize:C.fontSizeSm-1,color:C.textDim}}>{fmtDate(entry.created_at)}</div>
              <div style={{fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textSecondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entry.admin_email||"-"}</div>
              <div><ActionBadge action={entry.action} C={C}/></div>
              <div style={{fontFamily:F.body,fontSize:C.fontSizeSm-1,color:C.textSecondary,fontWeight:300}}>
                {entry.entity_id&&<span style={{color:C.blue,marginRight:6}}>{entry.entity_id}</span>}
                {entry.detail}
              </div>
            </div>
          ))}
          {total>LIMIT&&(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:"1rem"}}>
              <span style={{fontFamily:F.body,fontSize:C.fontSizeSm,color:C.textDim}}>Showing {page*LIMIT+1}–{Math.min((page+1)*LIMIT,total)} of {total}</span>
              <div style={{display:"flex",gap:8}}>
                <Btn small C={C} variant="ghost" disabled={page===0} onClick={()=>go(-1)}>← Previous</Btn>
                <Btn small C={C} variant="ghost" disabled={(page+1)*LIMIT>=total} onClick={()=>go(1)}>Next →</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

const TABS=[{id:"general",label:"General"},{id:"users",label:"Users"},{id:"account",label:"My Account"},{id:"notifications",label:"Notifications"},{id:"activity",label:"Activity Log"}];

export default function Settings() {
  const { C, F } = useTheme();
  const [tab,setTab]=useState("general");
  const [adminEmail,setAdminEmail]=useState("");
  const [adminId,setAdminId]=useState(null);

  useEffect(()=>{
    authApi.me().then(d=>{setAdminEmail(d.admin.email);setAdminId(d.admin.id);}).catch(()=>{});
  },[]);

  return (
    <div style={{padding:"2rem 2.5rem",maxWidth:820}}>
      <div style={{marginBottom:"1.75rem"}}>
        <div style={{fontSize:9.5,letterSpacing:"0.22em",textTransform:"uppercase",color:C.blue,fontFamily:F.body,marginBottom:6}}>Configuration</div>
        <h1 style={{fontFamily:F.display,fontSize:"2rem",fontWeight:500,color:C.textPrimary,margin:0}}>Settings</h1>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.border}`,marginBottom:"1.75rem",overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:"none",border:"none",borderBottom:tab===t.id?`2px solid ${C.blue}`:"2px solid transparent",cursor:"pointer",padding:"10px 20px",color:tab===t.id?C.blue:C.textSecondary,fontFamily:F.body,fontSize:C.fontSize,fontWeight:tab===t.id?600:400,transition:"color 0.2s",whiteSpace:"nowrap",marginBottom:-1}}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==="general"       && <TabGeneral C={C}/>}
      {tab==="users"         && <TabUsers currentAdminId={adminId} C={C}/>}
      {tab==="account"       && <TabAccount adminEmail={adminEmail} C={C}/>}
      {tab==="notifications" && <TabNotifications C={C}/>}
      {tab==="activity"      && <TabActivityLog C={C}/>}
    </div>
  );
}