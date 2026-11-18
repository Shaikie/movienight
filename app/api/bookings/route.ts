import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  try {
    const db = getAdminDb();
    const { data, error } = await db.from("bookings").select("seat_code,status").eq("event_id", eventId).eq("status", "confirmed");
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load seats." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const { token, eventId, seatCode, seatCodes } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || !eventId || (!Array.isArray(seatCodes) && typeof seatCode !== "string")) return NextResponse.json({ error: "Invitation, event and seat are required." }, { status: 400 });
  const db = getAdminDb();
  const { data: invite } = await db.from("invitations").select("id,event_id").eq("token_hash", hashToken(token)).eq("event_id", eventId).maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invitation is invalid for this event." }, { status: 404 });
  const selected = Array.isArray(seatCodes) ? seatCodes : [seatCode];
  if(selected.length<1||selected.length>2||selected.some(x=>typeof x!=="string"))return NextResponse.json({error:"Choose one or two seats."},{status:400});
  const { data, error } = await db.rpc("reserve_event_seats", { p_event_id: eventId, p_invitation_id: invite.id, p_seat_codes: selected });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json({ booking: data });
}
