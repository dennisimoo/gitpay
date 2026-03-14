import { NextResponse } from "next/server";
import { getLeaderboard, getTreasuryStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const leaderboard = getLeaderboard();
  const stats = getTreasuryStats();
  return NextResponse.json({ leaderboard, stats });
}
