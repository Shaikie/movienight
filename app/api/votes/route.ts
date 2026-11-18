import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { resolveStudentInvite } from "@/lib/student-auth";

export async function POST(request: Request) {
  const { token, movieId } = await request.json().catch(() => ({}));
  if (!movieId) {
    return NextResponse.json({ error: "Invitation and movie are required." }, { status: 400 });
  }

  const db = getAdminDb();
  const invite = await resolveStudentInvite(request,undefined,token);

  if (!invite) {
    return NextResponse.json({ error: "This invitation is invalid." }, { status: 404 });
  }

  const { data: event } = await db
    .from("events")
    .select("status,phase")
    .eq("id", invite.event_id)
    .single();

  if (event?.status !== "published" || event.phase !== "voting") {
    return NextResponse.json({ error: "Voting is not open." }, { status: 409 });
  }

  const {data:suggestion}=await db.from("movie_suggestions").select("id").eq("event_id",invite.event_id).eq("movie_id",Number(movieId)).maybeSingle();
  if(!suggestion)return NextResponse.json({error:"Vote for a suggested movie only."},{status:409});

  const { error } = await db
    .from("votes")
    .upsert(
      { event_id: invite.event_id, invitation_id: invite.id, movie_id: Number(movieId) },
      { onConflict: "event_id,invitation_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
