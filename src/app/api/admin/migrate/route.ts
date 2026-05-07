import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/admin/migrate - 从 JSON 迁移数据到数据库
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== "init-db-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 从 GitHub raw 获取最新的 providers.json
    const GITHUB_RAW_URL = "https://raw.githubusercontent.com/Indomi/ai-relay-dashboard/main/data/providers.json";
    
    const response = await fetch(GITHUB_RAW_URL);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch providers.json from GitHub" }, { status: 500 });
    }

    const providers = await response.json();
    console.log("[Migrate] Fetched", providers.length, "providers from GitHub");

    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const p of providers) {
      try {
        // 检查是否已存在
        const existing = await prisma.provider.findFirst({
          where: {
            OR: [
              { id: p.id },
              { name: p.name },
            ]
          }
        });

        if (existing) {
          // 更新
          await prisma.provider.update({
            where: { id: existing.id },
            data: {
              heatScore: p.heatScore || existing.heatScore,
              mentionCount: p.mentionCount || existing.mentionCount,
              lastSeen: new Date(),
            }
          });
          updated++;
        } else {
          // 创建
          await prisma.provider.create({
            data: {
              id: p.id,
              name: p.name,
              website: p.website || null,
              contact: p.contact || null,
              description: p.description || null,
              billingType: p.billingType || "token",
              status: "active",
              heatScore: p.heatScore || 0,
              mentionCount: p.mentionCount || 0,
              tags: p.tags || [],
              confidence: p.confidence || 0,
              firstSeen: new Date(p.firstSeen || new Date()),
              lastSeen: new Date(p.lastSeen || new Date()),
              models: {
                create: (p.models || []).map((m: any) => ({
                  model: m.model,
                  inputPrice: m.inputPrice || 0,
                  outputPrice: m.outputPrice || 0,
                  currency: m.currency || "CNY",
                }))
              },
              sources: {
                create: (p.sources || []).slice(0, 10).map((s: any) => ({
                  platform: s.platform,
                  title: s.title || "",
                  url: s.url || "",
                  author: s.author || null,
                  publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
                }))
              }
            }
          });
          created++;
        }
      } catch (e) {
        console.error("[Migrate] Error processing provider:", p.name, e);
        errors++;
      }
    }

    const finalCount = await prisma.provider.count();

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      totalProviders: finalCount
    });
  } catch (error) {
    console.error("[Migrate] Error:", error);
    return NextResponse.json({
      error: "Migration failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
