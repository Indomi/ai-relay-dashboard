import { NextRequest, NextResponse } from "next/server";
import { upsertProvider } from "@/lib/data/providers-db";

// POST /api/crawl/sync - 爬虫同步数据到数据库
// 供 GitHub Actions 爬虫调用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 验证 API Key
    const apiKey = request.headers.get("x-crawl-api-key");
    if (apiKey !== process.env.CRAWL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { providers } = body as {
      providers: {
        name: string;
        website?: string;
        contact?: string;
        description?: string;
        signupBonus?: string;
        billingType?: string;
        tags?: string[];
        confidence?: number;
        models: { model: string; inputPrice?: number; outputPrice?: number; currency?: string }[];
        source: { platform: string; title: string; url: string; author?: string; publishedAt?: string };
        // SubscriptionPlan 相关
        subscriptionPlans?: { name: string; price: number; period?: string; features?: string[]; autoRenew?: boolean; refundRule?: string }[];
        // ProviderPayment 相关
        minTopup?: number;
        canInvoice?: boolean;
        refundSupport?: string;
        refundCondition?: string;
        supportChannels?: string[];
        serviceHours?: string;
        // ProviderRisk 相关
        termsUrl?: string;
        termsSummary?: string;
        requiresLogin?: boolean;
      }[];
    };

    if (!providers || !Array.isArray(providers)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    let created = 0;
    let updated = 0;

    for (const provider of providers) {
      const result = await upsertProvider(provider);
      if (result) {
        // 判断是新建还是更新
        if (result.mentionCount <= 1) {
          created++;
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      total: providers.length,
    });
  } catch (error) {
    console.error("[API] Error in /api/crawl/sync:", error);
    return NextResponse.json(
      { error: "Failed to sync data" },
      { status: 500 }
    );
  }
}
