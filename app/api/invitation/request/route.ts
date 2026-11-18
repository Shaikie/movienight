import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function POST(request:Request){
 const {token}=await request.json().catch(()=>({}));
 if(typeof token!=="string")return NextResponse.json({error:"Personal registration token required."},{status:400});
 const db=getAdminDb();
 const {data:invite}=await db.from("invitations").select("id,event_id,approval_status").eq("token_hash",hashToken(token)).maybeSingle();
 if(!invite)return NextResponse.json({error:"Register first."},{status:401});
 const {data:event}=await db.from("events").select("phase,status").eq("id",invite.event_id).single();
 if(event?.status!=="published"||!["invitation_requests","reservations"].includes(event.phase))return NextResponse.json({error:"Invitation requests are not open yet."},{status:409});
 if(invite.approval_status==="approved")return NextResponse.json({ok:true,approved:true});
 const {error}=await db.from("invitations").update({invitation_requested:true}).eq("id",invite.id);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true,approved:false});
}