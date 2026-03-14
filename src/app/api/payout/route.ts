import { NextResponse } from "next/server";
import { triggerPayoutRound } from "@/lib/treasury";
import { emitEvent } from "@/lib/events";
import { transactions } from "@/lib/store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const results = await triggerPayoutRound();
    const successful = results.filter((r) => r.success);
    emitEvent("payout", { results, count: successful.length });
    return NextResponse.json({ results, count: successful.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
