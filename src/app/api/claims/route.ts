import { NextResponse } from "next/server";
import { getAllClaims, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [claims, stats] = await Promise.all([getAllClaims(), getStats()]);
  return NextResponse.json({ claims, stats });
}
