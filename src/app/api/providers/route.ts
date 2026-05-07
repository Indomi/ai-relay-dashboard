import { NextResponse } from "next/server";
import { getProviders, getStats } from "@/lib/data/providers";

// GET /api/providers - 获取所有商家列表
export async function GET() {
  try {
    const providers = getProviders();
    return NextResponse.json(providers);
  } catch (error) {
    console.error("[API] Error in /api/providers:", error);
    return NextResponse.json(
      { error: "Failed to load providers" },
      { status: 500 }
    );
  }
}
