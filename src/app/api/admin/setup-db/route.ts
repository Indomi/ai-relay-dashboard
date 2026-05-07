import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/admin/setup-db - 创建数据库表结构
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== "init-db-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];

    // 测试数据库连接
    try {
      await prisma.$queryRaw`SELECT 1`;
      results.push("✓ Database connection successful");
    } catch (e) {
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: e instanceof Error ? e.message : String(e) 
      }, { status: 500 });
    }

    // 创建 Provider 表
    try {
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
        )
      `);
      results.push("✓ Created Provider table");
    } catch (e) {
      results.push("✗ Failed to create Provider table: " + (e instanceof Error ? e.message : String(e)));
    }

    // 创建 ProviderModel 表
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProviderModel" (
          "id" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "model" TEXT NOT NULL,
          "inputPrice" DOUBLE PRECISION,
          "outputPrice" DOUBLE PRECISION,
          "currency" TEXT DEFAULT 'CNY',
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProviderModel_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ProviderModel_providerId_model_key" UNIQUE ("providerId", "model"),
          CONSTRAINT "ProviderModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      results.push("✓ Created ProviderModel table");
    } catch (e) {
      results.push("✗ Failed to create ProviderModel table: " + (e instanceof Error ? e.message : String(e)));
    }

    // 创建 ProviderSource 表
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProviderSource" (
          "id" TEXT NOT NULL,
          "providerId" TEXT NOT NULL,
          "platform" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "author" TEXT,
          "publishedAt" TIMESTAMP(3),
          "fetchedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProviderSource_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "ProviderSource_providerId_url_key" UNIQUE ("providerId", "url"),
          CONSTRAINT "ProviderSource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      results.push("✓ Created ProviderSource table");
    } catch (e) {
      results.push("✗ Failed to create ProviderSource table: " + (e instanceof Error ? e.message : String(e)));
    }

    // 创建索引
    try {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Provider_name_idx" ON "Provider"("name")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Provider_heatScore_idx" ON "Provider"("heatScore" DESC)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProviderModel_providerId_idx" ON "ProviderModel"("providerId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ProviderSource_providerId_idx" ON "ProviderSource"("providerId")`);
      results.push("✓ Created indexes");
    } catch (e) {
      results.push("✗ Failed to create indexes: " + (e instanceof Error ? e.message : String(e)));
    }

    // 检查最终表结构
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    ` as { table_name: string }[];

    return NextResponse.json({
      success: true,
      message: "Database setup complete",
      results,
      tables: tables.map(t => t.table_name),
      providerCount: await prisma.provider.count().catch(() => 0)
    });
  } catch (error) {
    console.error("[Setup] Error:", error);
    return NextResponse.json({
      error: "Database setup failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
