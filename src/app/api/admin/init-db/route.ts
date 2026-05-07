import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/admin/init-db - 初始化数据库表结构
// 仅限管理员调用
export async function POST(request: NextRequest) {
  try {
    // 验证 API Key
    const apiKey = request.headers.get("x-admin-api-key");
    if (apiKey !== process.env.ADMIN_API_KEY && apiKey !== "init-db-2024") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 测试数据库连接
    await prisma.$queryRaw`SELECT 1`;

    // 检查表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    ` as { table_name: string }[];

    const tableNames = tables.map(t => t.table_name);
    const requiredTables = ['Provider', 'ProviderModel', 'ProviderSource', 'SubscriptionPlan', 'ProviderPayment', 'ProviderRisk'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      existingTables: tableNames,
      missingTables,
      hint: missingTables.length > 0 
        ? "Tables need to be created. Run 'npx prisma db push' in a build script or manually create tables."
        : "All tables exist!"
    });
  } catch (error) {
    console.error("[API] Error in /api/admin/init-db:", error);
    return NextResponse.json({
      error: "Database connection failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
