import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/supabase-admin";
import { studentFromRequest,resolveStudentInvite } from "@/lib/student-auth";
import { hashToken } from "@/lib/tokens";
export async function POST(request:Request){
 const user=await studentFromRequest(request);
 if(!user)return NextResponse.json({error:"Verify your email and sign in before joining."},{status:401});
 const db=getAdminDb();
 const {data:event}=await db.from("events").select("id,phase").eq("status","published").limit(1).maybeSingle();
 if(!event)return NextResponse.json({error:"No active screening."},{status:409});
 const existing=await resolveStudentInvite(request,event.id);
 if(existing)return NextResponse.json({ok:true,registered:true});
 if(!["suggestions","voting"].includes(event.phase))return NextResponse.json({error:"Registration has closed for this screening."},{status:409});
 const body=await request.json().catch(()=>({}));
 const name=String(body.name??"").trim(),phone=String(body.phone??"").trim();
 if(name.length<2||name.length>80||phone.length<7||phone.length>30)return NextResponse.json({error:"Provide your full name and valid phone number."},{status:400});
 const token=randomBytes(32).toString("base64url");
 const {error}=await db.rpc("register_movie_night_guest",{p_event_id:event.id,p_name:name,p_email:user.email!.toLowerCase(),p_phone:phone,p_token_hash:hashToken(token)});
 if(error)return NextResponse.json({error:error.message},{status:409});
 const linked=await resolveStudentInvite(request,event.id);
 if(!linked)return NextResponse.json({error:"Registration saved but account linking needs retry. Refresh dashboard."},{status:500});
 return NextResponse.json({ok:true,registered:true},{status:201});
}
