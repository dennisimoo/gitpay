import { NextResponse } from "next/server";
import { getAllClaims } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAllClaims().slice(0, 50));
}
