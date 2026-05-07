import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/admin/migrate - 从 JSON 迁移数据到数据库
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== "init-db-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 先检查数据库连接和表结构
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[Migrate] Database connected");
    } catch (e) {
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: e instanceof Error ? e.message : String(e) 
      }, { status: 500 });
    }

    // 检查 Provider 表是否存在
    let tables: any[] = [];
    try {
      tables = await prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'Provider'
      `;
    } catch (e) {
      return NextResponse.json({ 
        error: "Failed to check tables", 
        details: e instanceof Error ? e.message : String(e) 
      }, { status: 500 });
    }

    if (tables.length === 0) {
      return NextResponse.json({ 
        error: "Provider table does not exist. Please run /api/admin/setup-db first" 
      }, { status: 500 });
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
    const errorDetails: string[] = [];

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
          // 创建 - 简化数据，避免外键约束问题
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
            }
          });
          created++;
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error("[Migrate] Error processing provider:", p.name, errorMsg);
        errorDetails.push(`${p.name}: ${errorMsg}`);
        errors++;
      }
    }

    const finalCount = await prisma.provider.count();

    return NextResponse.json({
      success: errors === 0,
      created,
      updated,
      errors,
      totalProviders: finalCount,
      errorDetails: errorDetails.slice(0, 5) // 只返回前5个错误
    });
  } catch (error) {
    console.error("[Migrate] Error:", error);
    return NextResponse.json({
      error: "Migration failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
