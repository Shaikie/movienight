import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
export async function GET() {
  try {
    const db = getAdminDb();
    const { data, error } = await db.from("events").select("id,title,description,venue,starts_at,status,seat_rows,seats_per_row,selected_movie_id").eq("status", "published").order("starts_at", { ascending: true }).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json({ event: null, configured: false, message: error instanceof Error ? error.message : "Unable to load event." });
  }
}
