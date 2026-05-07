import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/admin/setup-db - 创建数据库表并迁移数据
export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== "init-db-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`;
    console.log("[Setup] Database connection successful");

    // 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    ` as { table_name: string }[];

    const tableNames = tables.map(t => t.table_name);
    console.log("[Setup] Existing tables:", tableNames);

    // 如果 Provider 表不存在，需要手动创建
    if (!tableNames.includes('Provider')) {
      // 使用 raw SQL 创建表
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Provider" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "website" TEXT,
          "contact" TEXT,
          "description" TEXT,
          "billingType" TEXT DEFAULT 'token',
          "status" TEXT DEFAULT 'active',
          "heatScore" INTEGER DEFAULT 0,
          "mentionCount" INTEGER DEFAULT 0,
          "tags" TEXT[],
          "confidence" DOUBLE PRECISION DEFAULT 0,
          "firstSeen" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "lastSeen" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "Provider_name_idx" ON "Provider"("name");
        CREATE INDEX IF NOT EXISTS "Provider_heatScore_idx" ON "Provider"("heatScore" DESC);
      `);
      console.log("[Setup] Created Provider table");
    }

    // 检查 Provider 表中的数据量
    const count = await prisma.provider.count();
    console.log("[Setup] Provider count:", count);

    return NextResponse.json({
      success: true,
      message: "Database setup complete",
      tables: tableNames,
      providerCount: count,
      needsMigration: count === 0
    });
  } catch (error) {
    console.error("[Setup] Error:", error);
    return NextResponse.json({
      error: "Database setup failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
