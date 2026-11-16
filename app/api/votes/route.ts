import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";
export async function POST(request: Request) {
  const { token, movieId } = await request.json().catch(() => ({}));
  if (typeof token !== "string" || !movieId) return NextResponse.json({ error: "Invitation and movie are required." }, { status: 400 });
  const db = getAdminDb();
  const { data: invite } = await db.from("invitations").select("id,event_id,used_at").eq("token_hash", hashToken(token)).maybeSingle();
  if (!invite) return NextResponse.json({ error: "This invitation is invalid." }, { status: 404 });
  const { data: event } = await db.from("events").select("status").eq("id", invite.event_id).single();
  if (event?.status !== "published") return NextResponse.json({ error: "Voting is not open." }, { status: 409 });
  const { error } = await db.from("votes").upsert({ event_id: invite.event_id, invitation_id: invite.id, movie_id: Number(movieId) }, { onConflict: "event_id,invitation_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
