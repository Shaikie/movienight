import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  try {
    const db = getAdminDb();
    const { data, error } = await db
      .from("events")
      .select("id,title,description,venue,starts_at,status,seat_rows,seats_per_row,selected_movie_id,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load events." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.venue || !body.startsAt || Number.isNaN(Date.parse(body.startsAt))) return NextResponse.json({ error: "A title, venue and valid date are required." }, { status: 400 });
  try {
    const db = getAdminDb();
    const { data: current } = await db.from("events").select("id").eq("status","published").maybeSingle();
    if (current) await db.from("events").update({ status:"completed" }).eq("id",current.id);
    const { data, error } = await db.from("events").insert({ title:String(body.title).slice(0,100), venue:String(body.venue).slice(0,160), description:String(body.description??"").slice(0,500), starts_at:new Date(body.startsAt).toISOString(), status:"published" }).select("id,title,description,venue,starts_at,status,seat_rows,seats_per_row,selected_movie_id").single();
    if (error) throw error;
    return NextResponse.json({ event:data });
  } catch (error) { return NextResponse.json({ error:error instanceof Error?error.message:"Could not create event." }, { status:500 }); }
}
