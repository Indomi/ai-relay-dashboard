import { NextResponse } from "next/server";
import { getStats } from "@/lib/data/providers-db";

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[API] Error in /api/stats:", error);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 }
    );
  }
}
