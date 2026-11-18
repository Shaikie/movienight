import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";
export async function GET(request:Request){
 if(!await isAdmin())return NextResponse.json({error:"Host access required."},{status:401});
 const eventId=new URL(request.url).searchParams.get("eventId");
 if(!eventId)return NextResponse.json({error:"Event required."},{status:400});
 const db=getAdminDb();
 const {data,error}=await db.from("votes").select("movie_id").eq("event_id",eventId);
 return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({votes:data??[]});
}