/**
 * 价格采集爬虫 v3 - 通过 New API / One API 标准接口采集
 * 
 * New API 系统的定价数据通常通过以下接口获取：
 * - /api/pricing (需要认证)
 * - /api/models (公开)
 * - /v1/models (OpenAI 兼容接口，公开)
 * 
 * 用法: npx tsx scripts/crawl-pricing-v3.ts
 */

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

// 从 providers.json 读取所有商家
async function getProviders(): Promise<{ id: string; name: string; website: string }[]> {
  const fs = await import("fs");
  const data = JSON.parse(fs.readFileSync("data/providers.json", "utf-8"));
  return data.filter((p: any) => p.website).map((p: any) => ({
    id: p.id, name: p.name, website: p.website
  }));
}

// 尝试多种 API 接口获取价格数据
async function crawlProvider(website: string): Promise<{ models: PricingModel[]; source: string; error?: string }> {
  const baseUrl = website.replace(/\/+$/, "");
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
  };

  // 方法1: /api/pricing (New API 标准)
  try {
    const resp = await fetch(`${baseUrl}/api/pricing`, { headers, signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = await resp.json();
      const models = parsePricingResponse(data);
      if (models.length > 0) return { models, source: "/api/pricing" };
    }
  } catch {}

  // 方法2: /v1/models (OpenAI 兼容)
  try {
    const resp = await fetch(`${baseUrl}/v1/models`, { headers, signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = await resp.json();
      const models = parseModelsResponse(data);
      if (models.length > 0) return { models, source: "/v1/models" };
    }
  } catch {}

  // 方法3: /api/models
  try {
    const resp = await fetch(`${baseUrl}/api/models`, { headers, signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = await resp.json();
      const models = parsePricingResponse(data);
      if (models.length > 0) return { models, source: "/api/models" };
    }
  } catch {}

  return { models: [], source: "none", error: "所有接口均无法访问或无价格数据" };
}

function parsePricingResponse(data: any): PricingModel[] {
  const models: PricingModel[] = [];
  const items = data.data || data;

  if (!Array.isArray(items)) return models;

  for (const item of items) {
    const model = (item.model_name || item.model || item.id || item.name || "").toLowerCase();
    if (!model) continue;

    const inputPrice = parseFloat(
      item.input_price || item.inputPrice || item.prompt_price || item.prompt || 
      item.pricing?.prompt || item.pricing?.input || 0
    );
    const outputPrice = parseFloat(
      item.output_price || item.outputPrice || item.completion_price || item.completion ||
      item.pricing?.completion || item.pricing?.output || 0
    );

    if (inputPrice > 0 || outputPrice > 0) {
      models.push({ model, inputPrice, outputPrice, currency: "USD" });
    }
  }

  return models;
}

function parseModelsResponse(data: any): PricingModel[] {
  const models: PricingModel[] = [];
  const items = data.data || data;

  if (!Array.isArray(items)) return models;

  for (const item of items) {
    const model = (item.id || item.model || item.name || "").toLowerCase();
    if (!model) continue;

    // OpenAI /v1/models 格式通常不包含价格
    // 但有些中转站会扩展这个接口
    const pricing = item.pricing || {};
    const inputPrice = parseFloat(pricing.prompt || pricing.input || 0);
    const outputPrice = parseFloat(pricing.completion || pricing.output || 0);

    if (inputPrice > 0 || outputPrice > 0) {
      models.push({ model, inputPrice, outputPrice, currency: "USD" });
    }
  }

  return models;
}

async function main() {
  console.log("=== 价格采集爬虫 v3 (API 接口) ===\n");

  const providers = await getProviders();
  console.log(`共 ${providers.length} 个商家待采集\n`);

  const results: ProviderPricing[] = [];
  let successCount = 0;
  let totalModels = 0;

  for (const p of providers) {
    process.stdout.write(`${p.name} (${p.website}): `);
    
    const { models, source, error } = await crawlProvider(p.website);
    
    if (models.length > 0) {
      successCount++;
      totalModels += models.length;
      console.log(`✅ ${models.length} 个模型 [${source}]`);
      
      // 显示热门模型价格
      const hotModels = models.filter(m => 
        /gpt-4|gpt-5|claude-3|claude-4|gemini|deepseek/i.test(m.model)
      ).slice(0, 3);
      
      for (const m of hotModels) {
        console.log(`    ${m.model}: $${m.inputPrice}/$${m.outputPrice} per 1M`);
      }
    } else {
      console.log(`❌ ${error}`);
    }

    results.push({
      provider: p.name,
      website: p.website,
      models,
      crawledAt: new Date().toISOString(),
      error,
    });
  }

  console.log(`\n=== 汇总 ===`);
  console.log(`成功: ${successCount}/${providers.length}`);
  console.log(`总模型数: ${totalModels}`);

  // 保存
  const fs = await import("fs");
  fs.writeFileSync("data/pricing-results.json", JSON.stringify(results, null, 2));
  console.log(`\n结果已保存到 data/pricing-results.json`);
}

main().catch(console.error);
