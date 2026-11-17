import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { hashToken } from "@/lib/tokens";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const eventId = searchParams.get("eventId");
  if (!token || !eventId) return NextResponse.json({ error: "Token and eventId are required." }, { status: 400 });
  try {
    const db = getAdminDb();
    const { data: invite, error } = await db
      .from("invitations")
      .select("id,guest_name,event_id")
      .eq("token_hash", hashToken(token))
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) throw error;
    if (!invite) return NextResponse.json({ valid: false, error: "Invitation not found." }, { status: 404 });
    return NextResponse.json({ valid: true, invitation: { id: invite.id, guest_name: invite.guest_name, event_id: invite.event_id } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to validate invitation." }, { status: 500 }); }
}
