import { NextResponse } from "next/server";
import { getRecentContributions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getRecentContributions(50));
}
