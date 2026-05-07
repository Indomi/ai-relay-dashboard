import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/crawl/pricing - 接收价格采集数据并更新数据库
interface PricingModel {
  model: string;
  inputPrice: number;
  outputPrice: number;
  currency: string;
}

interface ProviderPricing {
  provider: string;
  website: string;
  models: PricingModel[];
  crawledAt: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-crawl-api-key");
    if (apiKey !== process.env.CRAWL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: ProviderPricing[] = await request.json();
    console.log(`[Pricing] Received pricing data for ${data.length} providers`);

    let updated = 0;
    let created = 0;
    let errors = 0;

    for (const item of data) {
      if (item.error || !item.models || item.models.length === 0) continue;

      try {
        // 查找对应的商家
        const provider = await prisma.provider.findFirst({
          where: {
            OR: [
              { name: item.provider },
              { website: item.website },
            ],
          },
        });

        if (!provider) {
          console.log(`[Pricing] Provider not found: ${item.provider}`);
          errors++;
          continue;
        }

        // 更新模型价格
        for (const model of item.models) {
          await prisma.providerModel.upsert({
            where: {
              providerId_model: {
                providerId: provider.id,
                model: model.model,
              },
            },
            create: {
              providerId: provider.id,
              model: model.model,
              inputPrice: model.inputPrice,
              outputPrice: model.outputPrice,
              currency: model.currency || "USD",
            },
            update: {
              inputPrice: model.inputPrice,
              outputPrice: model.outputPrice,
              currency: model.currency || "USD",
              updatedAt: new Date(),
            },
          });
        }

        updated++;
        console.log(`[Pricing] Updated ${item.models.length} models for ${item.provider}`);
      } catch (e) {
        console.error(`[Pricing] Error updating ${item.provider}:`, e);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      providersUpdated: updated,
      providersCreated: created,
      errors,
    });
  } catch (error) {
    console.error("[Pricing] Error:", error);
    return NextResponse.json(
      { error: "Failed to sync pricing data" },
      { status: 500 }
    );
  }
}
