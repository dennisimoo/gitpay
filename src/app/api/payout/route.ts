import { NextResponse } from "next/server";
import { getAllClaims } from "@/lib/store";
import { emitEvent } from "@/lib/events";

export const runtime = "nodejs";

export async function POST() {
  try {
    const claims = await getAllClaims();
    const pending = claims.filter((c) => !c.claimed);
    emitEvent("payout", { count: pending.length });
    return NextResponse.json({ count: pending.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
