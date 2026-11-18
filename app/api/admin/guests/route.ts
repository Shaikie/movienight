import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";
export async function GET(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const eventId=new URL(request.url).searchParams.get("eventId");
 if(!eventId)return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const [i,b,r]=await Promise.all([
  db.from("invitations").select("id,guest_name,approval_status,created_at").eq("event_id",eventId).order("created_at",{ascending:false}),
  db.from("bookings").select("invitation_id,seat_code,status").eq("event_id",eventId).eq("status","confirmed"),
  db.from("guest_registrations").select("invitation_id,full_name,email,phone").eq("event_id",eventId)
 ]);
 const error=i.error||b.error||r.error;
 if(error)return NextResponse.json({error:error.message},{status:500});
 const bookings=new Map<string,string[]>();
 for(const row of b.data??[])bookings.set(row.invitation_id,[...(bookings.get(row.invitation_id)??[]),row.seat_code]);
 const registrations=new Map((r.data??[]).map(x=>[x.invitation_id,x]));
 return NextResponse.json({guests:(i.data??[]).map(x=>({...x,...(registrations.get(x.id)??{}),seats:bookings.get(x.id)??[]}))});
}
export async function PATCH(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const {invitationId,status}=await request.json().catch(()=>({}));
 if(typeof invitationId!=="string"||!["approved","rejected"].includes(status))return NextResponse.json({error:"Invalid request."},{status:400});
 const db=getAdminDb();
 const {data:invite}=await db.from("invitations").select("event_id").eq("id",invitationId).single();
 if(!invite)return NextResponse.json({error:"Guest not found."},{status:404});
 const {data:event}=await db.from("events").select("phase").eq("id",invite.event_id).single();
 if(!["invitation_requests","reservations"].includes(event?.phase??""))return NextResponse.json({error:"Invitation decisions are not open."},{status:409});
 const {count}=await db.from("bookings").select("id",{head:true,count:"exact"}).eq("invitation_id",invitationId).eq("status","confirmed");
 if(count&&status==="rejected")return NextResponse.json({error:"Cannot reject a guest with confirmed seats."},{status:409});
 const {error}=await db.from("invitations").update({approval_status:status}).eq("id",invitationId);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
}