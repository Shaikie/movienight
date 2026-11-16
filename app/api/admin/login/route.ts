import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/tokens";
export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Set ADMIN_PASSWORD in your environment first." }, { status: 503 });
  if (typeof password !== "string" || password !== expected) return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
