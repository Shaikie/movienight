import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { resolveStudentInvite } from "@/lib/student-auth";
export async function POST(request:Request){
 const {token}=await request.json().catch(()=>({}));
 
 const db=getAdminDb();
 const invite=await resolveStudentInvite(request,undefined,token);
 if(!invite)return NextResponse.json({error:"Register first."},{status:401});
 const {data:event}=await db.from("events").select("phase,status").eq("id",invite.event_id).single();
 if(event?.status!=="published"||!["invitation_requests","reservations"].includes(event.phase))return NextResponse.json({error:"Invitation requests are not open yet."},{status:409});
 if(invite.approval_status==="approved")return NextResponse.json({ok:true,approved:true});
 const {error}=await db.from("invitations").update({invitation_requested:true}).eq("id",invite.id);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true,approved:false});
}