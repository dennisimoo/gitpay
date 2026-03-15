import { NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const txs = await getAllTransactions();
  return NextResponse.json(txs.slice(0, 50));
}
