import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";
export async function POST(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const {eventId,action,movieId}=await request.json().catch(()=>({}));
 if(typeof eventId!=="string")return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const {data:event,error:e}=await db.from("events").select("phase,status").eq("id",eventId).single();
 if(e||event?.status!=="published")return NextResponse.json({error:"Published event not found."},{status:404});
 if(action==="open-voting"&&event.phase==="suggestions"){
  const {count}=await db.from("movie_suggestions").select("id",{count:"exact",head:true}).eq("event_id",eventId);
  if(!count)return NextResponse.json({error:"At least one movie must be suggested."},{status:409});
  const {error}=await db.from("events").update({phase:"voting"}).eq("id",eventId).eq("phase","suggestions");
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
 }
 if(action==="close-voting"&&event.phase==="voting"){
  const {data:votes,error:ve}=await db.from("votes").select("movie_id").eq("event_id",eventId);
  const {data:movies,error:me}=await db.from("movie_suggestions").select("movie_id,movie_title,poster_path").eq("event_id",eventId);
  if(ve||me)return NextResponse.json({error:ve?.message||me?.message},{status:500});
  const counts=new Map<number,number>();
  for(const vote of votes??[])counts.set(vote.movie_id,(counts.get(vote.movie_id)??0)+1);
  const highest=Math.max(0,...counts.values());
  if(!highest)return NextResponse.json({error:"No votes yet. Keep voting open."},{status:409});
  const leaders=(movies??[]).filter(m=>(counts.get(m.movie_id)??0)===highest);
  if(leaders.length>1&&!leaders.some(m=>m.movie_id===movieId))
   return NextResponse.json({error:"Voting is tied. Select one of the tied movies to decide the winner.",tied:leaders},{status:409});
  const winner=leaders.find(m=>m.movie_id===movieId)??leaders[0];
  const {error}=await db.from("events").update({phase:"invitation_requests",selected_movie_id:winner.movie_id,winning_movie_title:winner.movie_title,winning_movie_poster:winner.poster_path}).eq("id",eventId).eq("phase","voting");
  if(error)return NextResponse.json({error:error.message},{status:500});
  const {data:reserved}=await db.from("bookings").select("invitation_id").eq("event_id",eventId).eq("status","confirmed");
  const protectedIds=new Set((reserved??[]).map(x=>x.invitation_id));
  const {data:invitations}=await db.from("invitations").select("id").eq("event_id",eventId);
  for(const invite of invitations??[]){
   if(protectedIds.has(invite.id))continue;
   const {error:statusError}=await db.from("invitations").update({approval_status:"pending",invitation_requested:false}).eq("id",invite.id);
   if(statusError)return NextResponse.json({error:statusError.message},{status:500});
  }
  return inviteError?NextResponse.json({error:inviteError.message},{status:500}):NextResponse.json({ok:true,winner});
 }
 if(action==="open-reservations"&&event.phase==="invitation_requests"){
  const {error}=await db.from("events").update({phase:"reservations"}).eq("id",eventId).eq("phase","invitation_requests");
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
 }
 return NextResponse.json({error:"Invalid phase transition."},{status:409});
}