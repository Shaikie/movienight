"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight, CalendarDays, Check, Clapperboard, Clock3, Film,
  Heart, Home, LayoutDashboard, LogOut, MapPin, Menu, Plus, Search,
  Settings, ShieldCheck, Sparkles, Ticket, Users, Vote, X
} from "lucide-react";

type Movie = { id:number; title:string; overview:string; poster_path:string|null; release_date:string; vote_average:number; genre:string };
type EventData = { id?:string; title:string; description:string; venue:string; starts_at:string; seat_rows:number; seats_per_row:number };
type Invite = { name:string; token?:string; createdAt?:string };
type Page = "home"|"movies"|"vote"|"seats"|"invite"|"host"|"host-event"|"host-invitations"|"host-reservations"|"host-votes"|"host-settings";

const sampleMovies:Movie[] = [
 {id:27205,title:"Inception",overview:"A skilled thief is offered a chance to have his past crimes forgiven if he can plant an idea in someone's mind.",poster_path:"/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",release_date:"2010-07-16",vote_average:8.4,genre:"Sci-Fi"},
 {id:157336,title:"Interstellar",overview:"A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars.",poster_path:"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",release_date:"2014-11-07",vote_average:8.7,genre:"Adventure"},
 {id:155,title:"The Dark Knight",overview:"Batman faces a criminal mastermind who wants to plunge Gotham in anarchy.",poster_path:"/qJ2tW6WMUDux911r6m7haRef0WH.jpg",release_date:"2008-07-18",vote_average:9.0,genre:"Action"},
 {id:496243,title:"Parasite",overview:"A family sees an opportunity when one of its members starts working for a wealthy household.",poster_path:"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",release_date:"2019-05-30",vote_average:8.5,genre:"Thriller"},
 {id:324857,title:"Spider-Man: Into the Spider-Verse",overview:"Miles Morales becomes Spider-Man and meets heroes from other dimensions.",poster_path:"/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg",release_date:"2018-12-14",vote_average:8.4,genre:"Animation"},
 {id:438631,title:"Dune",overview:"A gifted young man must travel to the most dangerous planet in the universe to secure his future.",poster_path:"/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",release_date:"2021-09-15",vote_average:8.0,genre:"Sci-Fi"},
 {id:546554,title:"Knives Out",overview:"A detective investigates the death of a celebrated crime novelist.",poster_path:"/pThyQovXQrw2m0s9x82twj48Jq4.jpg",release_date:"2019-11-27",vote_average:7.9,genre:"Mystery"},
 {id:13,title:"Forrest Gump",overview:"The extraordinary life of a gentle man unfolds across decades of American history.",poster_path:"/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",release_date:"1994-07-06",vote_average:8.5,genre:"Drama"}
];
const defaultEvent:EventData = {title:"MovieNight Premiere",description:"One night. One screen. Endless memories.",venue:"The Private Screening Room",starts_at:"2026-12-12T19:00",seat_rows:5,seats_per_row:8};
const formatDate=(value:string)=>{const d=new Date(value);return Number.isNaN(d.getTime())?"Date to be announced":d.toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Dar_es_Salaam"});};

async function apiJSON<T>(path:string,init?:RequestInit):Promise<T> {
  const res=await fetch(path,{headers:{"Content-Type":"application/json",...(init?.headers??{})},...init});
  if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||`Request failed (${res.status})`);}
  return res.json();
}

export default function MovieNight({page="home",invitationToken=""}:{page?:Page;invitationToken?:string}) {
  const [movies,setMovies]=useState<Movie[]>(sampleMovies);
  const [event,setEvent]=useState<EventData | null>(null);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [bookings,setBookings]=useState<Record<string,string>>({});
  const [votes,setVotes]=useState<Record<string,number>>({});
  const [token,setToken]=useState(()=>{
    if(typeof window!=="undefined"){
      return new URLSearchParams(window.location.search).get("token")||invitationToken;
    }
    return invitationToken;
  });
  const [query,setQuery]=useState("");
  const [debouncedQuery,setDebouncedQuery]=useState("");
  const [moviePage,setMoviePage]=useState(1);
  const [totalPages,setTotalPages]=useState(1);
  const [category,setCategory]=useState("popular");
  const [moviesLoading,setMoviesLoading]=useState(false);
  const [moviesError,setMoviesError]=useState("");
  const [shareUrl,setShareUrl]=useState(()=>{
    if(typeof window!=="undefined")return window.location.origin+"/register";
    return "";
  });
  const [genre,setGenre]=useState("All");
  const [selectedSeat,setSelectedSeat]=useState("");
  const [inviteNames,setInviteNames]=useState("");
  const [notice,setNotice]=useState("");
  const [admin,setAdmin]=useState<boolean | null>(null);
  const [validatedInvite,setValidatedInvite]=useState<{id:string;guest_name:string} | null>(null);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [hostPassword,setHostPassword]=useState("");
  const [eventForm,setEventForm]=useState<EventData>({...defaultEvent,id:undefined});

  const flash=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),4000);};

  useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedQuery(query.trim()),350);return()=>window.clearTimeout(timer);},[query]);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      try {
        const ev=await apiJSON<{event:EventData|null}>("/api/event");
        if(!cancelled && ev.event) { setEvent(ev.event); setEventForm({...ev.event,id:undefined}); }
      } catch {}

    })();
    return()=>{cancelled=true;};
  },[]);

  useEffect(()=>{
    let cancelled=false;
    const params=new URLSearchParams({page:String(moviePage),category});
    if(debouncedQuery)params.set("q",debouncedQuery);
    setTimeout(()=>{setMoviesLoading(true);setMoviesError("");},0);
    apiJSON<{results:Movie[];total_pages:number}>("/api/movies?"+params.toString()).then(data=>{if(!cancelled){setMovies(data.results);setTotalPages(data.total_pages||1);}}).catch(err=>{if(!cancelled)setMoviesError(err instanceof Error?err.message:"Unable to load movies.");}).finally(()=>{if(!cancelled)setMoviesLoading(false);});
    return()=>{cancelled=true;};
  },[moviePage,category,debouncedQuery]);

  useEffect(()=>{
    (async()=>{
      try {
        const sess=await apiJSON<{admin:boolean}>("/api/admin/session");
        setAdmin(sess.admin);
      } catch {setAdmin(false);}
    })();
  },[]);

  useEffect(()=>{
    if(event && page==="seats") {
      (async()=>{
        try {
          const bk=await apiJSON<{bookings:{seat_code:string}[]}>(`/api/bookings?eventId=${encodeURIComponent(event.id as string)}`);
          setBookings(Object.fromEntries(bk.bookings.map(b=>[b.seat_code,"confirmed"])));
        } catch {}
      })();
    }
  },[event,page]);

  useEffect(()=>{
    if(admin === true && page.startsWith("host") && event) {
      (async()=>{
        try {
          const invs=await apiJSON<{invitations:AdminInvitation[]}>(`/api/admin/invitations?eventId=${encodeURIComponent(event.id as string)}`);
          setInvites(invs.invitations.map((i)=>({name:i.guest_name,createdAt:i.created_at})));
        } catch {}
      })();
    }
  },[admin,page,event]);

  useEffect(()=>{
    if(page==="invite" && token && !validatedInvite && event) {
      (async()=>{
        try {
          const result=await apiJSON<{valid:boolean;invitation:{id:string;guest_name:string}}>(`/api/invitation/lookup?token=${encodeURIComponent(token)}&eventId=${encodeURIComponent(event.id as string)}`);
          if(result.valid) setValidatedInvite(result.invitation);
        } catch {}
      })();
    }
  },[page,token,event,validatedInvite]);

  const dbInvite=validatedInvite || invites.find(i=>i.token===token);  const inviteName=validatedInvite?.guest_name ?? invites.find(i=>i.token===token)?.name;
  const filtered=movies;
  const seatCodes=useMemo(()=>{
    if(!event) return [];
    return Array.from({length:event.seat_rows},(_,r)=>Array.from({length:event.seats_per_row},(_,s)=>String.fromCharCode(65+r)+"-"+(s+1))).flat();
  },[event]);
  const bookedCount=Object.keys(bookings).length;
  const nav=[["/","The night",Home],["/movies","Discover",Film],["/vote","Vote",Vote],["/seats","Seats",Ticket]] as const;

  const castVote=async(movieId:number)=>{
    if(!token){flash("Open your personal invitation link to vote.");return;}
    try {
      await apiJSON("/api/votes",{method:"POST",body:JSON.stringify({token,movieId})});
      setVotes({...votes,[token]:movieId});
      flash("Your vote has been recorded.");
    } catch(err){flash(err instanceof Error?err.message:"Vote failed.");}
  };

  const reserveSeat=async()=>{
    if(!token){flash("Open your personal invitation link to reserve a seat.");return;}
    if(!selectedSeat)return;
    if(!event){flash("No event available.");return;}
    if(bookings[selectedSeat]){flash("This seat is already reserved.");return;}
    try {
      await apiJSON("/api/bookings",{method:"POST",body:JSON.stringify({token,eventId:event.id,seatCode:selectedSeat})});
      setBookings({...bookings,[selectedSeat]:token});
      setSelectedSeat("");
      flash("Seat "+selectedSeat+" reserved.");
    } catch(err){flash(err instanceof Error?err.message:"Reservation failed.");}
  };

  const hostLogin=async()=>{
    if(!hostPassword){flash("Enter a host password.");return;}
    try {
      await apiJSON("/api/admin/login",{method:"POST",body:JSON.stringify({password:hostPassword})});
      setAdmin(true);
      setHostPassword("");
      flash("Host access enabled.");
    } catch(err){flash(err instanceof Error?err.message:"Login failed.");}
  };

  const hostLogout=async()=>{
    try {
      await apiJSON("/api/admin/logout",{method:"POST"});
      setAdmin(false);
      flash("Signed out of host mode.");
    } catch {}
  };

  const saveEvent=async()=>{
    const creating=!event?.id;
    try {
      const result=await apiJSON<{event:EventData}>("/api/admin/events",{
        method:creating?"POST":"PATCH",
        body:JSON.stringify({
          ...(creating?{}:{eventId:event.id}),
          title:eventForm.title,
          venue:eventForm.venue,
          startsAt:eventForm.starts_at,
          description:eventForm.description,
          seatRows:eventForm.seat_rows,
          seatsPerRow:eventForm.seats_per_row
        })
      });
      setEvent(result.event);
      setEventForm({...result.event,id:undefined});
      flash(creating?"Screening created.":"Screening details updated.");
    } catch(err){flash(err instanceof Error?err.message:"Failed to save event.");}
  };

type ApiInvitation = { id:string; name:string; token?:string; created_at?:string };
type AdminInvitation = { id:string; guest_name:string; created_at?:string };

  const createInvites=async()=>{
    const names=inviteNames.split("\n").map(n=>n.trim()).filter(Boolean);
    if(!names.length){flash("Add at least one guest name.");return;}
    if(!event){flash("No event configured.");return;}
    try {
      const result=await apiJSON<{invitations:ApiInvitation[]}>("/api/admin/invitations",{method:"POST",body:JSON.stringify({eventId:event.id,guests:names})});
      setInvites(result.invitations.map((i)=>({name:i.name,token:i.token,createdAt:i.created_at})));
      setInviteNames("");
      flash(result.invitations.length+" invitation(s) created.");
    } catch(err){flash(err instanceof Error?err.message:"Failed to create invitations.");}
  };

  const copyInvite=(inviteItem:Invite)=>{if(!inviteItem.token)return;const url=window.location.origin+"/invite/"+inviteItem.token;navigator.clipboard?.writeText(url);flash("Invitation link copied.");};

  const posterUrl=(path:string|null)=>path?.startsWith("/")?"https://image.tmdb.org/t/p/w500"+path:path||"";

  return <main className="mn-app">
   <header className="mn-header"><div className="mn-header-inner">
    <Link href="/" className="mn-brand"><span className="mn-brand-mark">✦</span><span>MOVIE<span>NIGHT</span></span></Link>
    <nav className="mn-nav">{nav.map(([href,label,Icon])=><Link key={href} href={href} className={((page==="home"&&href==="/")||(page==="movies"&&href==="/movies")||(page==="vote"&&href==="/vote")||(page==="seats"&&href==="/seats"))?"is-active":""}><Icon size={15}/>{label}</Link>)}</nav>
    <div className="mn-header-actions"><Link href="/host" className="mn-host-link"><ShieldCheck size={15}/> Host</Link><button className="mn-menu-toggle" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen?<X/>:<Menu/>}</button></div>
   </div>{mobileOpen&&<nav className="mn-mobile-nav">{nav.map(([href,label,Icon])=><Link key={href} href={href} onClick={()=>setMobileOpen(false)}><Icon size={17}/>{label}</Link>)}<Link href="/host" onClick={()=>setMobileOpen(false)}><ShieldCheck size={17}/>Host control</Link></nav>}</header>

   <div className="mn-main">
    {notice&&<div className="mn-toast" role="status"><Check size={16}/>{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {page==="home"&&<div className="mn-container">
     <section className="mn-hero"><div className="mn-hero-copy"><div className="mn-kicker"><span/> YOUR PRIVATE CINEMA EXPERIENCE</div><h1>One night.<br/>One screen.<br/><em>Endless memories.</em></h1><p>Good films are better together. Discover the shortlist, cast your vote and claim your seat for a night made for your favourite people.</p><div className="mn-actions"><Link className="mn-button" href="/movies">Explore the films <ArrowRight size={17}/></Link><Link className="mn-button mn-button-outline" href="/seats">Reserve a seat</Link></div><div className="mn-trust"><span><Users size={15}/> Invite only</span><span><Heart size={15}/> Made to share</span><span><ShieldCheck size={15}/> Private by design</span></div></div><div className="mn-hero-visual"><div className="mn-film-frame"><div className="mn-frame-top">A PRIVATE SCREENING</div><div className="mn-reel"><Clapperboard size={48}/></div><div className="mn-frame-bottom"><span>LIGHTS DOWN.</span><strong>Stories up.</strong></div></div><div className="mn-floating-note"><Sparkles size={15}/> YOUR PEOPLE. YOUR MOVIE NIGHT.</div></div></section>
     {event?<section className="mn-section"><div className="mn-section-heading"><div><div className="mn-kicker">THE MAIN EVENT</div><h2>Save your evening.</h2></div><span className="mn-pill"><span className="mn-dot"/> Screening planned</span></div><div className="mn-event-card"><div className="mn-event-date"><CalendarDays size={20}/><strong>{new Date(event.starts_at).toLocaleDateString("en-GB",{day:"2-digit",timeZone:"Africa/Dar_es_Salaam"})}</strong><span>{new Date(event.starts_at).toLocaleDateString("en-GB",{month:"short",year:"numeric",timeZone:"Africa/Dar_es_Salaam"})}</span></div><div className="mn-event-info"><h3>{event.title}</h3><p>{event.description}</p><div className="mn-event-meta"><span><Clock3 size={14}/>{formatDate(event.starts_at)}</span><span><MapPin size={14}/>{event.venue}</span><span><Ticket size={14}/>Free entry</span></div></div><Link href="/movies" className="mn-text-link">Explore films <ArrowRight size={15}/></Link></div></section>:null}
     <section className="mn-section"><div className="mn-section-heading"><div><div className="mn-kicker">CURATED FOR THE NIGHT</div><h2>Films worth gathering for.</h2><p>Explore the collection and find the one.</p></div><Link href="/movies" className="mn-text-link">View all films <ArrowRight size={15}/></Link></div><div className="mn-movie-grid">{movies.slice(0,4).map(m=><MovieCard key={m.id} movie={m} posterUrl={posterUrl} onAction={()=>window.location.assign("/vote")}/>)}</div></section>
     <section className="mn-host-cta"><div><div className="mn-kicker">MADE FOR THE HOST</div><h2>Bring everyone together.</h2><p>Set the screening, invite your people and let the group choose the film.</p></div><Link href="/host" className="mn-button mn-button-light">Open host control <ArrowRight size={16}/></Link></section>
    </div>}

    {(page==="movies"||page==="vote")&&<div className="mn-container mn-page"><PageHeading kicker={page==="vote"?"YOUR VOTE MATTERS":"THE MOVIE COLLECTION"} title={page==="vote"?"Choose the film.":"Find your next favourite."} desc="Browse the full catalogue or search for any movie by title."/>
    {page==="vote"&&<><div className="mn-info-banner"><ShieldCheck size={18}/><div><strong>One vote per invitation</strong><span>Register to receive a personal invitation, then vote for any movie.</span></div></div><div className="mn-token-entry"><label>Invitation token</label><input value={token} onChange={e=>setToken(e.target.value)} placeholder="Your personal invitation token"/><Link href="/register">Don&apos;t have an invitation? Register here</Link></div></>}
    <div className="mn-filter-bar"><div className="mn-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search any movie on TMDB..."/>{query&&<button onClick={()=>setQuery("")} aria-label="Clear search"><X size={15}/></button>}</div><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Movie category"><option value="popular">Popular</option><option value="now_playing">Now playing</option><option value="top_rated">Top rated</option><option value="upcoming">Upcoming</option></select></div>
    {moviesLoading&&<p role="status">Loading films...</p>}{moviesError&&<p role="alert">{moviesError}</p>}
    {!moviesLoading&&!moviesError&&movies.length===0&&<EmptyState title="No movies found" text="Try a different search term."/>}
    <div className="mn-movie-grid mn-movie-grid-large">{filtered.map(m=><MovieCard key={m.id} movie={m} posterUrl={posterUrl} action={page==="vote"?"Vote for this":"Vote for this film"} selected={votes[token]===m.id} onAction={()=>page==="vote"?castVote(m.id):window.location.assign("/vote?movie="+m.id+(token?"&token="+encodeURIComponent(token):""))}/>)}</div>
    <div className="mn-actions" style={{justifyContent:"center",marginTop:30}}><button className="mn-button mn-button-outline" disabled={moviePage<=1||moviesLoading} onClick={()=>{setMoviePage(p=>Math.max(1,p-1));window.scrollTo({top:0,behavior:"smooth"});}}>Previous</button><span className="mn-pill">Page {moviePage} of {totalPages}</span><button className="mn-button mn-button-outline" disabled={moviePage>=totalPages||moviesLoading} onClick={()=>{setMoviePage(p=>p+1);window.scrollTo({top:0,behavior:"smooth"});}}>Next</button></div></div>}

    {page==="seats"&&<div className="mn-container mn-page"><PageHeading kicker="YOUR PLACE IS WAITING" title="Choose your seat." desc="Pick an available seat for the screening. Reservations are free."/><div className="mn-seat-layout"><div className="mn-seat-main"><div className="mn-screen"><span>SCREEN</span></div><div className="mn-seat-grid">{seatCodes.map(code=>{const reserved=!!bookings[code];return <button key={code} disabled={reserved} onClick={()=>setSelectedSeat(code)} className={"mn-seat "+(reserved?"reserved":selectedSeat===code?"selected":"")}>{code}</button>;})}</div><div className="mn-seat-legend"><span><i/>Available</span><span><i className="selected"/>Selected</span><span><i className="reserved"/>Reserved</span></div></div><aside className="mn-seat-summary"><div className="mn-kicker">YOUR RESERVATION</div><h3>{selectedSeat||"No seat selected"}</h3><p>{selectedSeat?"This seat is ready to be reserved.":"Select a seat from the seating plan to continue."}</p><div className="mn-summary-line"><span>Ticket price</span><strong>FREE</strong></div><div className="mn-summary-line"><span>Seats reserved</span><strong>{bookedCount}</strong></div><label>Invitation token</label><input value={token} onChange={e=>setToken(e.target.value)} placeholder="Your invitation token"/><button className="mn-button mn-button-full" disabled={!selectedSeat||!token} onClick={reserveSeat}>Confirm reservation <ArrowRight size={16}/></button><small>Reservations are validated against your invitation.</small></aside></div></div>}

    {page==="invite"&&<div className="mn-container mn-page mn-invite-page"><div className="mn-invite-card"><div className="mn-invite-icon"><Ticket size={27}/></div><div className="mn-kicker">YOU&apos;RE ON THE LIST</div><h1>Your night is waiting.</h1><p>You&apos;ve received a personal invitation to MovieNight. Enter the experience, help choose the film and reserve your place.</p>{dbInvite?<div className="mn-invite-recipient"><span>INVITATION FOR</span><strong>{inviteName}</strong></div>:<div className="mn-invite-recipient"><span>INVITATION TOKEN</span><strong>{token||"Missing invitation token"}</strong><small>This invitation will be validated against the event.</small></div>}<div className="mn-invite-event"><strong>{event?event.title:"Upcoming screening"}</strong><span><CalendarDays size={14}/>{event?formatDate(event.starts_at):""}</span><span><MapPin size={14}/>{event?event.venue:""}</span></div><div className="mn-invite-actions"><Link href={"/vote?token="+encodeURIComponent(token)} className="mn-button">Vote for a film <ArrowRight size={16}/></Link><Link href={"/seats?token="+encodeURIComponent(token)} className="mn-button mn-button-outline">Choose your seat</Link></div></div></div>}

    {page.startsWith("host")&&<div className="mn-container mn-page mn-host-layout"><aside className="mn-sidebar"><div className="mn-sidebar-label">HOST WORKSPACE</div><Link href="/host" className={page==="host"?"active":""}><LayoutDashboard size={16}/>Overview</Link><Link href="/host/event" className={page==="host-event"?"active":""}><CalendarDays size={16}/>Screening</Link><Link href="/host/invitations" className={page==="host-invitations"?"active":""}><Users size={16}/>Invitations</Link><Link href="/host/reservations" className={page==="host-reservations"?"active":""}><Ticket size={16}/>Reservations</Link><Link href="/host/votes" className={page==="host-votes"?"active":""}><Vote size={16}/>Voting results</Link><Link href="/host/settings" className={page==="host-settings"?"active":""}><Settings size={16}/>Settings</Link><div className="mn-sidebar-bottom"><span>HOST WORKSPACE</span>{admin?<button onClick={hostLogout}><LogOut size={14}/>Sign out</button>:<button onClick={()=>{}}>Sign in</button>}</div></aside>
     <section className="mn-host-content">
      {!admin?<div className="mn-host-welcome"><div className="mn-invite-icon"><ShieldCheck size={27}/></div><div className="mn-kicker">PRIVATE HOST ACCESS</div><h1>Welcome behind the curtain.</h1><p>Manage your screening, invite guests, review votes and prepare the room. Enter the host password to access the workspace.</p><div className="mn-token-entry" style={{maxWidth:"400px",margin:"0 auto 25px",textAlign:"left"}}><label htmlFor="host-password">Host password</label><input id="host-password" type="password" value={hostPassword} onChange={e=>setHostPassword(e.target.value)} placeholder="Enter host password"/><button className="mn-button mn-button-full" onClick={hostLogin}>Enter workspace <ArrowRight size={16}/></button></div><small>Host access is protected by password via a signed session cookie.</small></div>:<>
       <div className="mn-host-top"><div><div className="mn-kicker">HOST CONTROL ROOM</div><h1>{page==="host"?"Good evening, host.":page==="host-event"?"Screening details":page==="host-invitations"?"Guest invitations":page==="host-reservations"?"Seat reservations":page==="host-votes"?"Voting overview":"Workspace settings"}</h1><p>Manage the details that make your MovieNight happen.</p></div><span className="mn-pill"><span className="mn-dot"/> Host access active</span></div>
       {page==="host"&&<><div className="mn-stat-grid"><Stat label="Invited guests" value={invites.length} icon={<Users/>}/><Stat label="Votes received" value={Object.keys(votes).length} icon={<Vote/>}/><Stat label="Seats reserved" value={bookedCount} icon={<Ticket/>}/><Stat label="Films available" value={movies.length} icon={<Film/>}/></div><div className="mn-host-card"><div className="mn-card-heading"><div><div className="mn-kicker">UP NEXT</div><h2>{event?event.title:"No event"}</h2></div><Link href="/host/event" className="mn-text-link">Edit screening <ArrowRight size={14}/></Link></div><p>{event?event.description:""}</p><div className="mn-event-meta"><span><CalendarDays size={14}/>{event?formatDate(event.starts_at):""}</span><span><MapPin size={14}/>{event?event.venue:""}</span></div></div><div className="mn-quick-grid"><QuickLink href="/host/event" title="Set up screening" text="Update date, venue and event details" icon={<CalendarDays/>}/><QuickLink href="/host/invitations" title="Invite your people" text="Create unique guest invitation links" icon={<Users/>}/><QuickLink href="/host/votes" title="Review the votes" text="See which films are leading" icon={<Vote/>}/></div></>}
       {page==="host-event"&&<div className="mn-host-card"><div className="mn-kicker">SCREENING SETUP</div><h2>Make it official.</h2><p>Set the details your guests will see on their invitation.</p><div className="mn-form-grid"><Field label="Event title"><input id="event-title" value={eventForm.title} onChange={e=>setEventForm({...eventForm,title:e.target.value})}/></Field><Field label="Venue"><input id="event-venue" value={eventForm.venue} onChange={e=>setEventForm({...eventForm,venue:e.target.value})}/></Field><Field label="Date and time"><input type="datetime-local" id="event-starts" value={eventForm.starts_at} onChange={e=>setEventForm({...eventForm,starts_at:e.target.value})}/></Field><Field label="Number of rows"><input type="number" min="1" max="12" id="event-rows" value={eventForm.seat_rows} onChange={e=>setEventForm({...eventForm,seat_rows:Number(e.target.value)})}/></Field><Field label="Seats per row"><input type="number" min="1" max="16" id="event-per-row" value={eventForm.seats_per_row} onChange={e=>setEventForm({...eventForm,seats_per_row:Number(e.target.value)})}/></Field><Field label="Description" wide><textarea id="event-desc" rows={3} value={eventForm.description} onChange={e=>setEventForm({...eventForm,description:e.target.value})}/></Field></div><button className="mn-button" onClick={saveEvent}>Save screening details <Check size={16}/></button></div>}
       {page==="host-invitations"&&<><div className="mn-host-card"><div className="mn-kicker">GUEST LIST</div><h2>Invite your people.</h2><p>Share the public registration link with anyone attending. Each guest registers with full name, email and phone, then receives a personal invitation. Capacity is limited to available seats.</p><div className="mn-token-entry"><input readOnly value={shareUrl} aria-label="Public registration URL"/><button className="mn-button" onClick={()=>{navigator.clipboard.writeText(shareUrl);flash("Registration link copied.");}}>Copy registration link</button></div><RegistrationQR url={shareUrl}/><p>Or create individual invitations manually below.</p><textarea className="mn-invite-textarea" rows={5} value={inviteNames} onChange={e=>setInviteNames(e.target.value)} placeholder={"Amina\nDaniel\nNeema"}/><button className="mn-button" onClick={createInvites}><Plus size={16}/> Generate invitations</button></div><div className="mn-host-card"><div className="mn-card-heading"><h2>Created invitations</h2><span className="mn-pill">{invites.length} total</span></div>{invites.length?invites.map(item=><div className="mn-invite-row" key={item.token||item.name}><div><strong>{item.name}</strong><span>{item.token?"/invite/"+item.token:"(pending)"}</span></div>{item.token?<button className="mn-button mn-button-small" onClick={()=>copyInvite(item)}>Copy link</button>:<small>Link was shown when this invitation was created.</small>}</div>):<EmptyState title="No invitations yet" text="Your generated guest links will appear here."/>}</div></>}
       {page==="host-reservations"&&<div className="mn-host-card"><div className="mn-kicker">GUEST SEATING</div><h2>Confirmed seats.</h2><p>Review the seats claimed through invitations.</p>{Object.entries(bookings).length?Object.entries(bookings).map(([seat,owner])=><div className="mn-invite-row" key={seat}><div><strong>Seat {seat}</strong><span>{invites.find(item=>item.token===owner)?.name||"Guest invitation"}</span></div><span className="mn-pill">Reserved</span></div>):<EmptyState title="No seats reserved" text="Guest seat reservations will appear here."/>}</div>}
       {page==="host-votes"&&<div className="mn-host-card"><div className="mn-kicker">LIVE TALLY</div><h2>What the group is choosing.</h2><p>Votes submitted using invitations.</p>{movies.map(m=><div className="mn-vote-result" key={m.id}><div><strong>{m.title}</strong><span>{Object.values(votes).filter(id=>id===m.id).length} votes</span></div><div className="mn-vote-track"><i style={{width:(Object.keys(votes).length?Object.values(votes).filter(id=>id===m.id).length/Math.max(1,Object.keys(votes).length)*100:0)+"%"}}/></div></div>)}</div>}
       {page==="host-settings"&&<div className="mn-host-card"><div className="mn-kicker">WORKSPACE PREFERENCES</div><h2>Settings</h2><p>Host access is protected by password via a signed session cookie. Configure ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your environment.</p><div className="mn-setting-row"><div><strong>Admin access</strong><span>Protected by host password via signed session cookie.</span></div><span className="mn-pill">{admin?"Active":"Inactive"}</span></div><div className="mn-setting-row"><div><strong>Movie catalogue</strong><span>{movies.length} films currently loaded.</span></div><span className="mn-pill">Live data</span></div><button className="mn-button mn-button-outline" onClick={()=>{setInvites([]);setVotes({});setBookings({});flash("Guest data cleared.");}}>Clear guest data</button></div>}
      </>}</section>
    </div>}
   </div>
   <footer className="mn-footer"><div className="mn-container mn-footer-inner"><Link href="/" className="mn-brand"><span className="mn-brand-mark">✦</span><span>MOVIE<span>NIGHT</span></span></Link><span>One Night. One Screen. Endless Memories.</span><span>© 2026 MOVIENIGHT</span></div></footer>
  </main>;
}

function MovieCard({movie,posterUrl,onAction,action="Explore film",selected=false}:{movie:Movie;posterUrl:(path:string|null)=>string;onAction:()=>void;action?:string;selected?:boolean}) {
  const [failed,setFailed]=useState(false);
  return <article className="mn-movie-card"><div className="mn-poster">{movie.poster_path&&!failed?<img src={posterUrl(movie.poster_path)} alt={movie.title+" poster"} loading="lazy" onError={()=>setFailed(true)}/>:<div className="mn-poster-fallback"><Film size={34}/><span>{movie.title}</span><small>{movie.genre}</small></div>}<span className="mn-rating">★ {movie.vote_average?.toFixed(1)||"—"}</span><span className="mn-poster-shade"/></div><div className="mn-movie-info"><span className="mn-movie-genre">{movie.genre||"FEATURED"} · {movie.release_date?.slice(0,4)||"TBA"}</span><h3>{movie.title}</h3><p>{movie.overview}</p><button className={"mn-movie-action "+(selected?"voted":"")} onClick={onAction}>{selected?<><Check size={14}/> Your vote</>:<>{action}<ArrowRight size={14}/></>}</button></div></article>;
}
function PageHeading({kicker,title,desc}:{kicker:string;title:string;desc:string}){return <div className="mn-page-heading"><div className="mn-kicker">{kicker}</div><h1>{title}</h1><p>{desc}</p></div>;}
function EmptyState({title,text}:{title:string;text:string}){return <div className="mn-empty"><Film size={25}/><strong>{title}</strong><span>{text}</span></div>;}
function Stat({label,value,icon}:{label:string;value:number;icon:ReactNode}){return <div className="mn-stat"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;}
function QuickLink({href,title,text,icon}:{href:string;title:string;text:string;icon:React.ReactNode}){return <Link href={href} className="mn-quick-link"><span>{icon}</span><strong>{title}</strong><small>{text}</small><ArrowRight size={15}/></Link>;}
function Field({label,children,wide=false}:{label:string;children:ReactNode;wide?:boolean}){return <label className={"mn-field "+(wide?"wide":"")}>{label}{children}</label>;}

function RegistrationQR({url}:{url:string}) { const [qr,setQr]=useState("");useEffect(()=>{if(!url)return;let active=true;import("qrcode").then(q=>q.toDataURL(url,{width:260,margin:2})).then(image=>{if(active)setQr(image);}).catch(()=>{});return()=>{active=false;};},[url]);return qr?<div style={{margin:"20px 0"}}><img src={qr} alt="QR code for public guest registration" width={220} height={220}/><p><a href={qr} download="movienight-registration-qr.png">Download QR code</a></p></div>:null;}
