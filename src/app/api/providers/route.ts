import { NextResponse } from "next/server";
import { getProviders } from "@/lib/data/providers";

export async function GET() {
  const providers = getProviders();
  return NextResponse.json(providers);
}
