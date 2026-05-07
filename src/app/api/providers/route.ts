import { NextResponse } from "next/server";
import { getProviders } from "@/lib/data/providers-db";

export async function GET() {
  try {
    const providers = await getProviders();
    console.log("[API] Returning", providers.length, "providers");
    return NextResponse.json(providers);
  } catch (error) {
    console.error("[API] Error in /api/providers:", error);
    return NextResponse.json(
      { 
        error: "Failed to load providers",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
