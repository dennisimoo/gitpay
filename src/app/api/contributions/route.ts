import { NextResponse } from "next/server";
import { getAllClaims } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const claims = await getAllClaims();
  return NextResponse.json(claims.slice(0, 50));
}
