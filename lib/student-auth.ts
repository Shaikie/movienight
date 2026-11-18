import { createClient } from "@supabase/supabase-js";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function studentFromRequest(request:Request){
 const bearer=request.headers.get("authorization");
 if(!bearer?.startsWith("Bearer "))return null;
 const db=getAdminDb();
 const {data:{user},error}=await db.auth.getUser(bearer.slice(7));
 if(error||!user||!user.email_confirmed_at||!user.email)return null;
 return user;
}
export async function resolveStudentInvite(request:Request,eventId?:string,legacyToken?:string){
 const db=getAdminDb();
 const user=await studentFromRequest(request);
 if(user){
  let query=db.from("invitations").select("id,event_id,approval_status,invitation_requested").eq("user_id",user.id);
  if(eventId)query=query.eq("event_id",eventId);
  const {data:linked}=await query.order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(linked)return linked;
  const email=user.email?.toLowerCase();
  if(email){
   let existing=db.from("guest_registrations").select("invitation_id,event_id").ilike("email",email);
   if(eventId)existing=existing.eq("event_id",eventId);
   const {data:record}=await existing.order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(record){
    const {data:claimed}=await db.from("invitations").update({user_id:user.id}).eq("id",record.invitation_id).is("user_id",null).select("id,event_id,approval_status,invitation_requested").maybeSingle();
    if(claimed)return claimed;
    const {data:owned}=await db.from("invitations").select("id,event_id,approval_status,invitation_requested").eq("id",record.invitation_id).eq("user_id",user.id).maybeSingle();
    if(owned)return owned;
   }
  }
 }
 if(typeof legacyToken==="string"&&legacyToken.length){
  let query=db.from("invitations").select("id,event_id,approval_status,invitation_requested").eq("token_hash",hashToken(legacyToken));
  if(eventId)query=query.eq("event_id",eventId);
  const {data}=await query.maybeSingle();
  return data;
 }
 return null;
}
export function publicAuthClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error("Missing Supabase public Auth configuration.");
 return createClient(url,key);
}
