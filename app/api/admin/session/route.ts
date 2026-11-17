import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/tokens";

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}
