import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { resolveStudentInvite,studentFromRequest } from "@/lib/student-auth";
export async function GET(request:Request){
 const user=await studentFromRequest(request);
 if(!user)return NextResponse.json({error:"Sign in and verify your email first."},{status:401});
 const db=getAdminDb();
 const {data:event}=await db.from("events").select("id,title,phase,starts_at,venue,winning_movie_title").eq("status","published").limit(1).maybeSingle();
 if(!event)return NextResponse.json({user:{email:user.email},event:null});
 const invite=await resolveStudentInvite(request,event.id);
 if(!invite)return NextResponse.json({user:{email:user.email},event,registered:false});
 const [registration,vote,suggestions,bookings,orders]=await Promise.all([
 db.from("guest_registrations").select("full_name,email,phone").eq("invitation_id",invite.id).maybeSingle(),
 db.from("votes").select("movie_id").eq("invitation_id",invite.id).eq("event_id",event.id).maybeSingle(),
 db.from("movie_suggestions").select("movie_title").eq("invitation_id",invite.id).eq("event_id",event.id),
 db.from("bookings").select("seat_code,status").eq("invitation_id",invite.id).eq("event_id",event.id),
 db.from("snack_orders").select("id,quantity,total_tzs,status").eq("invitation_id",invite.id).eq("event_id",event.id)
 ]);
 return NextResponse.json({user:{email:user.email},event,registered:true,registration:registration.data,invitation:{approval_status:invite.approval_status,requested:invite.invitation_requested},vote:vote.data,suggestions:suggestions.data??[],seats:bookings.data??[],orders:orders.data??[]},{headers:{"Cache-Control":"no-store"}});
}
