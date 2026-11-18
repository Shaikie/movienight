import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function POST(request:Request) {
 const body=await request.json().catch(()=>({}));
 const name=typeof body.name==="string"?body.name.trim():"";
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const phone=typeof body.phone==="string"?body.phone.trim():"";
 if(name.length<2||name.length>80||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||phone.length<7||phone.length>30)
  return NextResponse.json({error:"Enter your full name, a valid email and phone number."},{status:400});
 try {
  const db=getAdminDb();
  const {data:event,error:evError}=await db.from("events").select("id,phase").eq("status","published").order("starts_at",{ascending:true}).limit(1).maybeSingle();
  if(evError)throw evError;
  if(!event)return NextResponse.json({error:"No screening is open for registration."},{status:409});
  if(!["suggestions","voting"].includes(event.phase))return NextResponse.json({error:"Registration is closed for this screening."},{status:409});
  const token=randomBytes(32).toString("base64url");
  const {error}=await db.rpc("register_movie_night_guest",{p_event_id:event.id,p_name:name,p_email:email,p_phone:phone,p_token_hash:hashToken(token)});
  if(error)return NextResponse.json({error:error.message},{status:409});
  return NextResponse.json({url:new URL("/invite/"+token,request.url).toString(),token},{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("MovieNight registration failed:",error);
  const message=error instanceof Error?error.message:"Unknown server error";
  const configurationError=message.includes("Supabase is not configured");
  return NextResponse.json({error:configurationError?"Supabase environment variables are missing. Check the server configuration.":"Registration could not connect to the database. Check the server terminal for the underlying error."},{status:500});
 }
}
