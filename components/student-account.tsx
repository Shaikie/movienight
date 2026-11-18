"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { browserSupabase } from "@/lib/supabase-browser";
type Dashboard={user?:{email:string};event?:{title:string;phase:string;starts_at:string;venue:string;winning_movie_title:string|null}|null;registered?:boolean;registration?:{full_name:string};invitation?:{approval_status:string;requested:boolean};vote?:{movie_id:number}|null;suggestions?:{movie_title:string}[];seats?:{seat_code:string;status:string}[];orders?:{id:string;quantity:number;total_tzs:number;status:string}[]};
export default function StudentAccount({mode}:{mode:"login"|"register"|"dashboard"}){
 const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[phone,setPhone]=useState("");
 const [message,setMessage]=useState(""),[busy,setBusy]=useState(false),[dashboard,setDashboard]=useState<Dashboard|null>(null),[signedIn,setSignedIn]=useState(false);
 async function load(){
  try{const sb=browserSupabase();const {data:{session}}=await sb.auth.getSession();setSignedIn(!!session);
   if(!session)return;
   const response=await fetch("/api/student/dashboard",{headers:{Authorization:"Bearer "+session.access_token},cache:"no-store"});
   const json=await response.json();if(!response.ok)throw Error(json.error);setDashboard(json);
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load dashboard");}
 }
 useEffect(()=>{if(mode==="dashboard")void load();},[mode]);
 async function submit(){
  setBusy(true);setMessage("");
  try{const sb=browserSupabase();
   if(mode==="register"){
    const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+"/auth/callback"}});
    if(error)throw error;
    setMessage(data.session?"Account created. Open your dashboard to join the screening.":"Check your inbox to verify your email, then log in and join the screening.");
   }else{
    const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;window.location.assign("/dashboard");
   }
  }catch(e){setMessage(e instanceof Error?e.message:"Authentication failed");}finally{setBusy(false);}
 }
 async function google(){setBusy(true);try{const {error}=await browserSupabase().auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/auth/callback"}});if(error)throw error;}catch(e){setMessage(e instanceof Error?e.message:"Google sign-in failed");setBusy(false);}}
 async function enroll(){setBusy(true);try{const {data:{session}}=await browserSupabase().auth.getSession();if(!session)throw Error("Log in again.");const response=await fetch("/api/student/enroll",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token},body:JSON.stringify({name,phone})});const json=await response.json();if(!response.ok)throw Error(json.error);setMessage("You have joined this screening!");await load();}catch(e){setMessage(e instanceof Error?e.message:"Could not join");}finally{setBusy(false);}}
 async function signOut(){await browserSupabase().auth.signOut();window.location.assign("/login");}
 return <main className="mn-app"><div className="mn-container mn-page"><Link href="/" className="mn-brand">✦ COICT MOVIENIGHT</Link>
 {mode!=="dashboard"?<section className="mn-account-shell">
 <aside className="mn-account-aside"><div><div className="mn-kicker">YOUR CINEMA EXPERIENCE STARTS HERE</div><h2>Your seat.<br/>Your movie.<br/><span style={{color:"#e7c76a"}}>Your night.</span></h2><p>Join the CoICT community for unforgettable movie nights. Discover, vote and reserve your favourite spot.</p></div><p>✦ ONE SCREEN. ONE COMMUNITY. ONE NIGHT.</p></aside>
 <div className="mn-account-panel"><div className="mn-kicker">{mode==="register"?"JOIN MOVIENIGHT":"WELCOME BACK"}</div><h1>{mode==="register"?"Create your account":"Sign in to MovieNight"}</h1><p className="mn-account-subtitle">{mode==="register"?"Create your student account to take part in screenings.":"Access your invitations, movie votes, seats and snack orders."}</p>
 {message&&<div role="status" className="mn-info-banner">{message}</div>}
 <form className="mn-account-form" onSubmit={e=>{e.preventDefault();void submit();}}>
 <label className="mn-field">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
 <label className="mn-field">Password<input required minLength={6} type="password" autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
 <button type="submit" className="mn-button" disabled={busy||!email||password.length<6}>{busy?"Please wait…":mode==="register"?"Create account":"Sign in"}</button>
 <div className="mn-account-divider">OR CONTINUE WITH</div>
 <button type="button" className="mn-button mn-button-outline" disabled={busy} onClick={google}>Continue with Google</button>
 <div className="mn-account-links">{mode==="login"?<><Link href="/signup">New here? Create account</Link><button type="button" disabled={!email||busy} onClick={async()=>{try{const {error}=await browserSupabase().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth/callback"});if(error)throw error;setMessage("Password reset email sent.");}catch(e){setMessage(e instanceof Error?e.message:"Reset failed");}}}>Forgot password?</button></>:<Link href="/login">Already registered? Sign in</Link>}</div>
 </form></div></section>:
 <section className="mn-dashboard-shell">
 <div className="mn-dashboard-head"><div><div className="mn-kicker">STUDENT WORKSPACE</div><h1>Your MovieNight</h1><p className="mn-account-subtitle">{dashboard?.user?.email||"Your personal cinema experience"}</p></div>{signedIn&&<button className="mn-button mn-button-outline" onClick={signOut}>Sign out</button>}</div>
 {message&&<div role="status" className="mn-info-banner">{message}</div>}
 {!signedIn?<div className="mn-dashboard-card"><h2>Sign in to continue</h2><p>Access your MovieNight account to see your screening.</p><Link className="mn-button" href="/login">Sign in</Link></div>:!dashboard?<div className="mn-dashboard-card" role="status">Loading your screening...</div>:!dashboard.event?<div className="mn-dashboard-card"><h2>No active screening yet</h2><p>Watch this space for the next CoICT MovieNight announcement.</p><Link className="mn-button" href="/">Back to home</Link></div>:<>
 <div className="mn-dashboard-card"><div className="mn-kicker">CURRENT SCREENING</div><h2>{dashboard.event.title}</h2><p>{dashboard.event.venue} · {dashboard.event.phase.replaceAll("_"," ")}</p><p>{new Date(dashboard.event.starts_at).toLocaleString("en-GB",{timeZone:"Africa/Dar_es_Salaam",dateStyle:"full",timeStyle:"short"})}</p>{dashboard.event.winning_movie_title&&<p><strong>Selected movie: {dashboard.event.winning_movie_title}</strong></p>}</div>
 {!dashboard.registered?<div className="mn-dashboard-card"><h2>Join this screening</h2><p>Join to suggest films, vote and reserve seats. Registrations using your verified email are linked automatically.</p><form className="mn-account-form" onSubmit={e=>{e.preventDefault();void enroll();}}><label className="mn-field">Full name<input required value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label><label className="mn-field">Phone number<input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label><button className="mn-button" type="submit" disabled={busy||!name.trim()||!phone.trim()}>Join screening</button></form></div>:<>
 <div className="mn-dashboard-grid"><div className="mn-dashboard-tile"><small>Invitation status</small><strong>{dashboard.invitation?.approval_status||"Not requested"}</strong><p>{dashboard.invitation?.requested?"Request submitted":"No request yet"}</p></div><div className="mn-dashboard-tile"><small>Your vote</small><strong>{dashboard.vote?"Submitted":"Not submitted"}</strong></div><div className="mn-dashboard-tile"><small>Reserved seats</small><strong>{dashboard.seats?.filter(s=>s.status==="confirmed").map(s=>s.seat_code).join(", ")||"None yet"}</strong></div><div className="mn-dashboard-tile"><small>Movie suggestions</small><strong>{dashboard.suggestions?.length??0}</strong><p>{dashboard.suggestions?.map(s=>s.movie_title).join(", ")||"No suggestions yet"}</p></div><div className="mn-dashboard-tile"><small>Snack orders</small><strong>{dashboard.orders?.length??0}</strong></div><div className="mn-dashboard-tile"><small>Student</small><strong>{dashboard.registration?.full_name||"MovieNight member"}</strong></div></div>
 <div className="mn-dashboard-card"><div className="mn-kicker">EXPLORE MOVIENIGHT</div><h2>What would you like to do?</h2><div className="mn-dashboard-actions"><Link className="mn-button" href="/movies">Suggest movies</Link><Link className="mn-button mn-button-outline" href="/vote">Cast your vote</Link><Link className="mn-button mn-button-outline" href="/seats">Reserve seats</Link><Link className="mn-button mn-button-outline" href="/snacks">Order snacks</Link></div></div>
 </>}</>}
 </section>}</div></main>;
}
