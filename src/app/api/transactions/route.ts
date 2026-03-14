import { NextResponse } from "next/server";
import { transactions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(transactions.slice(0, 50));
}
