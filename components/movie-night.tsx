"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Crown, Film, Heart, MapPin, Search, ShieldCheck, Ticket, Users } from "lucide-react";

type Movie = { id: number; title: string; overview?: string; poster_path?: string | null; release_date?: string; vote_average?: number };
type EventData = { id: string; title: string; description: string; venue: string; starts_at: string; status: string; seat_rows: number; seats_per_row: number; selected_movie_id?: number | null };

export default function MovieNight({ invitationToken = "" }: { invitationToken?: string }) {
  const [tab,setTab]=useState<"home"|"movies"|"vote"|"seats"|"admin">("home");
  const [event,setEvent]=useState<EventData|null>(null);
  const [movies,setMovies]=useState<Movie[]>([]);
  const [bookings,setBookings]=useState<{seat_code:string}[]>([]);
  const [query,setQuery]=useState("");
  const [token,setToken]=useState(invitationToken);
  const [selectedSeat,setSelectedSeat]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [adminPassword,setAdminPassword]=useState("");
  const [admin,setAdmin]=useState(false);
  const [inviteNames,setInviteNames]=useState("");
  const [inviteLinks,setInviteLinks]=useState<{name:string;url:string}[]>([]);
  const [eventTitle,setEventTitle]=useState("MovieNight Premiere");
  const [eventVenue,setEventVenue]=useState("Private screening room");
  const [eventDate,setEventDate]=useState("");
  const [eventDescription,setEventDescription]=useState("One night. One screen. Endless memories.");
  const [currentYear,setCurrentYear]=useState<number | null>(null);

  const loadEvent=async()=>{const r=await fetch("/api/event");const d=await r.json();if(d.event){setEvent(d.event);setEventTitle(d.event.title);setEventVenue(d.event.venue);setEventDescription(d.event.description);}};
  const loadMovies=async(q="")=>{const r=await fetch("/api/movies"+(q?"?q="+encodeURIComponent(q):""));const d=await r.json();setMovies(d.results??[]);};
  const loadBookings=async(id:string)=>{const r=await fetch("/api/bookings?eventId="+id);const d=await r.json();setBookings(d.bookings??[]);};
  useEffect(()=>{loadEvent();loadMovies();},[]);
  useEffect(()=>{setCurrentYear(new Date().getFullYear());},[]);
  useEffect(()=>{if(event?.id)loadBookings(event.id);},[event?.id]);
  useEffect(()=>{if(invitationToken)setToken(invitationToken);},[invitationToken]);
  const availableSeats=useMemo(()=>{if(!event)return[];return Array.from({length:event.seat_rows},(_,r)=>Array.from({length:event.seats_per_row},(_,s)=>String.fromCharCode(65+r)+"-"+(s+1))).flat();},[event]);
  const notify=(text:string)=>{setMessage(text);window.setTimeout(()=>setMessage(""),5000);};
  const runSearch=async()=>{setBusy(true);await loadMovies(query);setBusy(false);};
  const vote=async(movieId:number)=>{if(!token){notify("Open your personal invitation link to vote.");return;}setBusy(true);const r=await fetch("/api/votes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,movieId})});const d=await r.json();notify(r.ok?"Your vote has been counted. You can change it before voting closes.":d.error);setBusy(false);};
  const reserve=async()=>{if(!token||!event||!selectedSeat){notify("Open your invitation and select a seat first.");return;}setBusy(true);const r=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,eventId:event.id,seatCode:selectedSeat})});const d=await r.json();notify(r.ok?"Seat "+selectedSeat+" is yours. Your reservation is confirmed.":d.error);if(r.ok){setSelectedSeat("");loadBookings(event.id);}setBusy(false);};
  const login=async()=>{setBusy(true);const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:adminPassword})});const d=await r.json();setAdmin(r.ok);notify(r.ok?"Admin access granted.":d.error);setBusy(false);};
  const createEvent=async()=>{setBusy(true);const r=await fetch("/api/admin/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:eventTitle,venue:eventVenue,description:eventDescription,startsAt:eventDate})});const d=await r.json();if(r.ok){setEvent(d.event);notify("Your screening event is published.");}else notify(d.error);setBusy(false);};
  const createInvites=async()=>{if(!event){notify("Create a screening event first.");return;}const guests=inviteNames.split("\n").map(n=>n.trim()).filter(Boolean);setBusy(true);const r=await fetch("/api/admin/invitations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId:event.id,guests})});const d=await r.json();if(r.ok){setInviteLinks(d.invitations);notify("Personal invitations created.");}else notify(d.error);setBusy(false);};

  return <main className="shell">
    <div className="container">
      <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><span>MOVIENIGHT</span></div><nav className="nav">
        {(["home","movies","vote","seats","admin"] as const).map((item)=><button key={item} className={tab===item?"active":""} onClick={()=>setTab(item)}>{item==="home"?"The Night":item==="movies"?"Discover":item==="vote"?"Vote":item==="seats"?"Seats":"Host"}</button>)}
      </nav><span className="badge">Private screening</span></header>

      {message&&<div className="toast" role="status">{message}</div>}
      {token&&<div className="toast"><ShieldCheck size={15} style={{display:"inline",marginRight:8}}/>You're using a personal guest invitation. Your vote and reservation are linked to this invite.</div>}

      {tab==="home"&&<><section className="hero"><div><div className="eyebrow">Your private cinema experience</div><h1>One night.<br/>One screen.<br/><em>Endless memories.</em></h1><p>Good films are better together. Discover the shortlist, cast your vote and claim your seat for a night made for your favourite people.</p><div className="hero-actions"><button className="btn" onClick={()=>setTab("movies")}>Explore the films <ChevronRight size={16} style={{display:"inline",verticalAlign:"middle"}}/></button><button className="btn secondary" onClick={()=>setTab("seats")}>Reserve a seat</button></div><div style={{display:"flex",gap:22,marginTop:34,color:"#a99da4",fontSize:12}}><span><Users size={15} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Invite only</span><span><Heart size={15} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Made to share</span></div></div><div className="hero-art"><div className="art-note"><span>THE ART OF A GOOD NIGHT</span><strong>Lights down. Stories up.</strong></div></div></section>
        <section className="section"><div className="section-head"><div><div className="eyebrow">The main event</div><h2>Save your evening.</h2></div><span className="badge">{event?"Event published":"Awaiting host setup"}</span></div>
          {event?<div className="event-card"><div><div className="eyebrow">You're invited</div><h2 className="serif" style={{fontSize:28,margin:"10px 0"}}>{event.title}</h2><p className="muted" style={{margin:0}}>{event.description}</p><div className="event-meta"><span><CalendarDays size={15}/>{new Date(event.starts_at).toLocaleString()}</span><span><MapPin size={15}/>{event.venue}</span><span><Ticket size={15}/>Free entry</span></div></div><button className="btn" onClick={()=>setTab(token?"seats":"vote")}>Join the night</button></div>:<div className="panel"><p className="muted">The host is preparing the screening. Check back when your event invitation is ready.</p><button className="btn secondary" onClick={()=>setTab("admin")}>Host setup</button></div>}</section>
        <section className="section"><div className="section-head"><div><div className="eyebrow">A little anticipation</div><h2>Make it a movie night.</h2></div><button className="ghost" onClick={()=>setTab("movies")}>Browse films ↗</button></div><div className="movie-grid">{movies.slice(0,5).map(m=><MovieTile key={m.id} movie={m} onVote={()=>setTab("vote")}/>)}</div></section></>}

      {tab==="movies"&&<section className="section"><div className="section-head"><div><div className="eyebrow">The shortlist starts here</div><h2>Find your next favourite.</h2></div><span className="badge">Movie discovery</span></div><div className="form-row" style={{marginBottom:24}}><input className="field" style={{flex:1}} placeholder="Search a title, genre or actor..." value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runSearch()}/><button className="btn" onClick={runSearch} disabled={busy}><Search size={15} style={{display:"inline",verticalAlign:"middle",marginRight:7}}/>Search</button></div><div className="movie-grid">{movies.map(m=><MovieTile key={m.id} movie={m} onVote={()=>{setTab("vote");}}/>)}</div>{!movies.length&&<p className="muted">No films found. Try another title.</p>}</section>}

      {tab==="vote"&&<section className="section"><div className="section-head"><div><div className="eyebrow">Your voice, your movie</div><h2>What are we watching?</h2></div><span className="badge">One vote per invite</span></div><div className="panel"><p className="muted">Choose the film you'd love to see on the big screen. You can update your vote until the host closes voting.</p><div className="form-row" style={{margin:"18px 0"}}><input className="field" style={{flex:1}} placeholder="Your invitation token" value={token} onChange={e=>setToken(e.target.value)}/></div><div className="movie-grid">{movies.map(m=><MovieTile key={m.id} movie={m} onVote={()=>vote(m.id)} action="Vote for this"/>)}</div></div></section>}

      {tab==="seats"&&<section className="section"><div className="section-head"><div><div className="eyebrow">Choose your place</div><h2>Every seat has a story.</h2></div><span className="badge">Free reservation</span></div><div className="panel"><p className="muted" style={{textAlign:"center"}}>Select one available seat. Reservations are confirmed instantly and each invitation can reserve one seat.</p><div className="screen"/><div className="screen-label">SCREEN</div><div className="seat-grid">{availableSeats.map(seat=>{const taken=bookings.some(b=>b.seat_code===seat);return <button key={seat} disabled={taken} onClick={()=>setSelectedSeat(seat)} className={"seat "+(taken?"taken":selectedSeat===seat?"mine":"")}>{seat}</button>})}</div><div style={{display:"flex",justifyContent:"center",gap:20,fontSize:11,color:"#a99da4",flexWrap:"wrap"}}><span>◻ Available</span><span style={{color:"#e5c58a"}}>■ Selected</span><span style={{color:"#77676d"}}>■ Reserved</span></div><div style={{display:"flex",justifyContent:"center",marginTop:24}}><button className="btn" disabled={!selectedSeat||busy} onClick={reserve}>Confirm {selectedSeat||"seat"}</button></div></div></section>}

      {tab==="admin"&&<section className="section"><div className="section-head"><div><div className="eyebrow">Behind the curtain</div><h2>Host control room.</h2></div><span className="badge">Administrator</span></div>{!admin?<div className="panel" style={{maxWidth:500}}><Crown color="#e5c58a"/><h3 className="serif" style={{fontSize:25}}>Welcome, host.</h3><p className="muted">Sign in with the admin password configured in your deployment environment.</p><input className="field" type="password" style={{width:"100%",margin:"8px 0 15px"}} placeholder="Admin password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)}/><button className="btn" disabled={busy} onClick={login}>Unlock host controls</button></div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:18}}><div className="panel"><h3 className="serif" style={{fontSize:23}}>Screening details</h3><p className="muted">Create and publish the event guests will see.</p><label className="muted">Event title</label><input className="field" style={{width:"100%",margin:"6px 0 12px"}} value={eventTitle} onChange={e=>setEventTitle(e.target.value)}/><label className="muted">Venue</label><input className="field" style={{width:"100%",margin:"6px 0 12px"}} value={eventVenue} onChange={e=>setEventVenue(e.target.value)}/><label className="muted">Date and time</label><input className="field" type="datetime-local" style={{width:"100%",margin:"6px 0 12px"}} value={eventDate} onChange={e=>setEventDate(e.target.value)}/><label className="muted">Description</label><input className="field" style={{width:"100%",margin:"6px 0 16px"}} value={eventDescription} onChange={e=>setEventDescription(e.target.value)}/><button className="btn" disabled={busy||!eventDate} onClick={createEvent}>{event?"Update screening":"Publish screening"}</button></div><div className="panel"><h3 className="serif" style={{fontSize:23}}>Guest invitations</h3><p className="muted">Add one guest name per line. Each person receives a unique invite link.</p><textarea className="field" rows={7} style={{width:"100%",resize:"vertical",margin:"8px 0 14px"}} placeholder={"Amina\nDaniel\nNeema"} value={inviteNames} onChange={e=>setInviteNames(e.target.value)}/><button className="btn" disabled={busy||!event} onClick={createInvites}>Generate invitations</button>{inviteLinks.map(i=><div key={i.url} style={{borderTop:"1px solid #383039",paddingTop:10,marginTop:12,fontSize:12}}><strong>{i.name}</strong><input readOnly className="field" style={{width:"100%",marginTop:6,fontSize:11}} value={i.url} onFocus={e=>e.currentTarget.select()}/></div>)}</div></div>}</section>}

      <footer className="footer"><span>© {currentYear ?? "MOVIENIGHT"} MOVIENIGHT · One Night. One Screen. Endless Memories.</span><span>Made for the people, not the crowd.</span></footer>
    </div>
  </main>;
}

function MovieTile({movie,onVote,action="Choose this film"}:{movie:Movie;onVote:()=>void;action?:string}) {
  const poster=movie.poster_path?.startsWith("/")?"https://image.tmdb.org/t/p/w500"+movie.poster_path:movie.poster_path??"";
  return <article className="movie-card"><div className="poster">{poster?<img src={poster} alt={movie.title} loading="lazy"/>:<div className="no-poster"><Film size={35}/></div>}</div><div className="movie-info"><h3 title={movie.title}>{movie.title}</h3><p>{movie.release_date?.slice(0,4)||"Release TBA"} · ★ {movie.vote_average?.toFixed(1)||"—"}</p><button className="small-btn" onClick={onVote}>{action}</button></div></article>;
}
