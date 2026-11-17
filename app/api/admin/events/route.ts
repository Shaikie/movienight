import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/supabase-admin";
import { isAdmin } from "@/lib/tokens";

type EventInput = {
  eventId?: string;
  title?: string;
  venue?: string;
  description?: string;
  startsAt?: string;
  seatRows?: number;
  seatsPerRow?: number;
};

function validateEvent(body: EventInput) {
  const startsAt = body.startsAt ? Date.parse(body.startsAt) : NaN;
  const seatRows = Number(body.seatRows ?? 5);
  const seatsPerRow = Number(body.seatsPerRow ?? 8);

  if (!body.title?.trim() || !body.venue?.trim() || !Number.isFinite(startsAt)) {
    return { error: "A title, venue and valid date are required." };
  }
  if (!Number.isInteger(seatRows) || seatRows < 1 || seatRows > 12) {
    return { error: "Rows must be between 1 and 12." };
  }
  if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 16) {
    return { error: "Seats per row must be between 1 and 16." };
  }

  return {
    values: {
      title: body.title.trim().slice(0, 100),
      venue: body.venue.trim().slice(0, 160),
      description: String(body.description ?? "").slice(0, 500),
      starts_at: new Date(startsAt).toISOString(),
      seat_rows: seatRows,
      seats_per_row: seatsPerRow,
    },
  };
}

const eventColumns = "id,title,description,venue,starts_at,status,seat_rows,seats_per_row,selected_movie_id,created_at";

export async function GET() {
  if (!await isAdmin()) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const { data, error } = await db
      .from("events")
      .select(eventColumns)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ events: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load events." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as EventInput;
  const validated = validateEvent(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const { data: current, error: currentError } = await db
      .from("events")
      .select("id")
      .eq("status", "published")
      .maybeSingle();

    if (currentError) throw currentError;

    if (current) {
      const { error } = await db
        .from("events")
        .update({ status: "completed" })
        .eq("id", current.id);
      if (error) throw error;
    }

    const { data, error } = await db
      .from("events")
      .insert({ ...validated.values, status: "published" })
      .select(eventColumns)
      .single();

    if (error) throw error;
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create event." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as EventInput;
  if (!body.eventId) {
    return NextResponse.json({ error: "eventId is required." }, { status: 400 });
  }

  const validated = validateEvent(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const { data, error } = await db
      .from("events")
      .update(validated.values)
      .eq("id", body.eventId)
      .eq("status", "published")
      .select(eventColumns)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Published event not found." }, { status: 404 });
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update event." },
      { status: 500 }
    );
  }
}
