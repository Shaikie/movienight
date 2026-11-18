import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";
export async function GET(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const eventId=new URL(request.url).searchParams.get("eventId");
 if(!eventId)return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const [p,o,i]=await Promise.all([
 db.from("snack_products").select("*").eq("event_id",eventId).order("created_at"),
 db.from("snack_orders").select("*").eq("event_id",eventId).order("created_at",{ascending:false}),
 db.from("invitations").select("id,guest_name").eq("event_id",eventId)
 ]);
 if(p.error||o.error||i.error)return NextResponse.json({error:p.error?.message||o.error?.message||i.error?.message},{status:500});
 return NextResponse.json({products:p.data??[],orders:(o.data??[]).map(x=>({...x,guest_name:(i.data??[]).find(y=>y.id===x.invitation_id)?.guest_name??"Guest",product_name:(p.data??[]).find(y=>y.id===x.product_id)?.name??"Snack"}))});
}
export async function POST(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const {eventId,name,description,price,stock}=await request.json().catch(()=>({}));
 if(typeof eventId!=="string"||typeof name!=="string"||name.trim().length<2||name.length>100||!Number.isInteger(price)||price<0||!Number.isInteger(stock)||stock<0)
 return NextResponse.json({error:"Valid snack name, TZS price and stock required."},{status:400});
 const db=getAdminDb();
 const {error}=await db.from("snack_products").insert({event_id:eventId,name:name.trim(),description:String(description??"").slice(0,300),price_tzs:price,stock});
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true},{status:201});
}
export async function PATCH(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const {orderId,status}=await request.json().catch(()=>({}));
 if(typeof orderId!=="string"||!["confirmed","fulfilled","cancelled"].includes(status))return NextResponse.json({error:"Invalid order update."},{status:400});
 const db=getAdminDb();
 const {error}=await db.from("snack_orders").update({status}).eq("id",orderId).eq("status","pending");
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
}