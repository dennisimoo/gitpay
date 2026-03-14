import { NextResponse } from "next/server";
import { getAllClaims, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ claims: getAllClaims(), stats: getStats() });
}
