import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function GET(request:Request){
 const eventId=new URL(request.url).searchParams.get("eventId");
 if(!eventId)return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const {data,error}=await db.from("snack_products").select("id,name,description,price_tzs,stock").eq("event_id",eventId).eq("active",true).order("created_at");
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({products:data??[]});
}
export async function POST(request:Request){
 const {token,eventId,productId,quantity}=await request.json().catch(()=>({}));
 if(typeof token!=="string"||typeof eventId!=="string"||typeof productId!=="string"||!Number.isInteger(quantity))
 return NextResponse.json({error:"Valid invitation, snack and quantity required."},{status:400});
 const db=getAdminDb();
 const {data:invite}=await db.from("invitations").select("id,approval_status").eq("token_hash",hashToken(token)).eq("event_id",eventId).maybeSingle();
 if(!invite||invite.approval_status!=="approved")return NextResponse.json({error:"Approved invitation required."},{status:403});
 const {data,error}=await db.rpc("place_snack_order",{p_event_id:eventId,p_invitation_id:invite.id,p_product_id:productId,p_quantity:quantity});
 return error?NextResponse.json({error:error.message},{status:409}):NextResponse.json({order:data},{status:201});
}