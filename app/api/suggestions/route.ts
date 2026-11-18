import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function GET(request:Request){
 const eventId=new URL(request.url).searchParams.get("eventId");
 if(!eventId)return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const {data,error}=await db.from("movie_suggestions").select("id,movie_id,movie_title,poster_path,created_at").eq("event_id",eventId).order("created_at",{ascending:false});
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({suggestions:data??[]});
}
export async function POST(request:Request){
 const {token,movieId,movieTitle,posterPath}=await request.json().catch(()=>({}));
 if(typeof token!=="string"||!Number.isSafeInteger(movieId)||typeof movieTitle!=="string"||movieTitle.trim().length<1||movieTitle.length>200)
 return NextResponse.json({error:"A registered guest and valid movie are required."},{status:400});
 const db=getAdminDb();
 const {data:invite}=await db.from("invitations").select("id,event_id").eq("token_hash",hashToken(token)).maybeSingle();
 if(!invite)return NextResponse.json({error:"Register first and use your personal link."},{status:401});
 const {data:event}=await db.from("events").select("phase,status").eq("id",invite.event_id).single();
 if(event?.status!=="published"||event.phase!=="suggestions")return NextResponse.json({error:"Suggestions are closed."},{status:409});
 const {error}=await db.from("movie_suggestions").insert({event_id:invite.event_id,invitation_id:invite.id,movie_id:movieId,movie_title:movieTitle.trim(),poster_path:typeof posterPath==="string"?posterPath:null});
 return error?NextResponse.json({error:error.code==="23505"?"This movie has already been suggested.":error.message},{status:409}):NextResponse.json({ok:true},{status:201});
}