import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken, isAdmin } from "@/lib/tokens";

export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  try {
    const db = getAdminDb();
    const { data, error } = await db
      .from("invitations")
      .select("id,guest_name,created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ invitations: data ?? [] });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load invitations." }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  const { eventId, guests } = await request.json().catch(() => ({}));
  if (!eventId || !Array.isArray(guests) || guests.length < 1 || guests.length > 50) return NextResponse.json({ error: "Provide an event and between 1 and 50 guest names." }, { status: 400 });
  const db = getAdminDb();
  const created = [];
  for (const raw of guests) {
    const name = String(raw).trim().slice(0, 80);
    if (!name) continue;
    const token = randomBytes(24).toString("base64url");
    const { error } = await db.from("invitations").insert({ event_id: eventId, guest_name: name, token_hash: hashToken(token) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    created.push({ name, token, url: new URL("/invite/" + token, request.url).toString() });
  }
  return NextResponse.json({ invitations: created });
}
