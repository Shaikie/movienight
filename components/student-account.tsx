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
 <section className="mn-host-card" style={{maxWidth:660,margin:"32px auto"}}>
 <h1>{mode==="register"?"Create your student account":mode==="login"?"Student login":"Your MovieNight dashboard"}</h1>
 {message&&<p role="status" className="mn-info-banner">{message}</p>}
 {mode!=="dashboard"?<div className="mn-form-grid">
 <label className="mn-field">Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <label className="mn-field">Password<input type="password" autoComplete={mode==="register"?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 <button className="mn-button" disabled={busy||!email||password.length<6} onClick={submit}>{mode==="register"?"Create account":"Log in"}</button>
 <button className="mn-button mn-button-outline" disabled={busy} onClick={google}>Continue with Google</button>
 {mode==="login"?<><Link href="/signup">Create an account</Link><button className="mn-button mn-button-outline" disabled={!email||busy} onClick={async()=>{try{const {error}=await browserSupabase().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/auth/callback"});if(error)throw error;setMessage("Password reset email sent.");}catch(e){setMessage(e instanceof Error?e.message:"Reset failed");}}}>Forgot password?</button></>:<Link href="/login">Already registered? Log in</Link>}
 </div>:!signedIn?<p>Please <Link href="/login">log in</Link> to view your dashboard.</p>:!dashboard?<p>Loading your screening...</p>:<div>
 <p>Signed in as <strong>{dashboard.user?.email}</strong> <button onClick={signOut}>Sign out</button></p>
 {!dashboard.event?<p>No screening is currently active.</p>:<><h2>{dashboard.event.title}</h2><p>Phase: {dashboard.event.phase} · {dashboard.event.venue}</p>
 {!dashboard.registered?<><p>Join this screening to suggest movies, vote, and reserve seats. Existing registrations using the same verified email are automatically linked.</p>
 <label className="mn-field">Full name<input value={name} onChange={e=>setName(e.target.value)}/></label><label className="mn-field">Phone<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><button className="mn-button" disabled={busy} onClick={enroll}>Join screening</button></>:<>
 <p>Welcome, {dashboard.registration?.full_name}.</p><p>Invitation: <strong>{dashboard.invitation?.approval_status}</strong>{dashboard.invitation?.requested?" · Requested":""}</p>
 <p>Vote: {dashboard.vote?"Submitted":"Not submitted"}</p><p>Suggested movies: {dashboard.suggestions?.map(s=>s.movie_title).join(", ")||"None"}</p><p>Reserved seats: {dashboard.seats?.filter(s=>s.status==="confirmed").map(s=>s.seat_code).join(", ")||"None"}</p>
 <p>Snack orders: {dashboard.orders?.length??0}</p>
 <div className="mn-actions"><Link className="mn-button" href="/movies">Suggest</Link><Link className="mn-button" href="/vote">Vote</Link><Link className="mn-button" href="/seats">Reserve seats</Link><Link className="mn-button" href="/snacks">Snacks</Link></div>
 </>}</>}</div>}
 </section></div></main>;
}
