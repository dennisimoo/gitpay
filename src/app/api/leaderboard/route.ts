import { NextResponse } from "next/server";
import { getLeaderboard, getStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [leaderboard, stats] = await Promise.all([getLeaderboard(), getStats()]);
  return NextResponse.json({ leaderboard, stats });
}
