/**
 * 价格采集爬虫 - 从商家的定价页面采集真实模型价格
 * 
 * 支持的系统：
 * 1. New API / One API 系统（大多数中转商使用）
 *    - 定价页面通常在 /pricing 或 /token
 *    - 有标准化的 API 接口可以获取模型列表和价格
 * 
 * 用法: npx tsx scripts/crawl-pricing.ts
 */

interface PricingResult {
  provider: string;
  website: string;
  models: {
    model: string;
    inputPrice: number;
    outputPrice: number;
    currency: string;
  }[];
  crawledAt: string;
  error?: string;
}

// 已知商家的定价页面和 API
const PROVIDER_PRICING_SOURCES: {
  name: string;
  website: string;
  pricingUrl: string;
  type: "new-api" | "one-api" | "custom";
}[] = [
  { name: "球球Token", website: "https://qiuqiutoken.com", pricingUrl: "https://qiuqiutoken.com/api/pricing", type: "new-api" },
  { name: "SiliconFlow", website: "https://siliconflow.cn", pricingUrl: "https://siliconflow.cn/pricing", type: "custom" },
  { name: "API2D", website: "https://api2d.net", pricingUrl: "https://api2d.net/api/pricing", type: "new-api" },
  { name: "OhMyGPT", website: "https://api.ohmygpt.com", pricingUrl: "https://api.ohmygpt.com/api/pricing", type: "new-api" },
  { name: "WildCard", website: "https://api.wildcard.com.cn", pricingUrl: "https://api.wildcard.com.cn/api/pricing", type: "new-api" },
];

// New API / One API 系统的标准 API
async function crawlNewApiPricing(provider: typeof PROVIDER_PRICING_SOURCES[0]): Promise<PricingResult> {
  const result: PricingResult = {
    provider: provider.name,
    website: provider.website,
    models: [],
    crawledAt: new Date().toISOString(),
  };

  try {
    // 尝试标准 New API 接口
    const baseUrl = provider.website.replace(/\/$/, "");
    
    // 方法1: 直接调用 /api/pricing
    const response = await fetch(`${baseUrl}/api/pricing`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // 方法2: 尝试 /api/models
      const modelsResp = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (modelsResp.ok) {
        const modelsData = await modelsResp.json();
        const models = modelsData.data || [];
        
        for (const m of models) {
          const modelInfo = parseModelPricing(m);
          if (modelInfo) {
            result.models.push(modelInfo);
          }
        }
        return result;
      }

      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    // New API 返回格式: { data: [{ model_name, input_price, output_price, ... }] }
    const pricingData = data.data || data;
    
    if (Array.isArray(pricingData)) {
      for (const item of pricingData) {
        const model = item.model_name || item.model || item.name;
        const inputPrice = parseFloat(item.input_price || item.inputPrice || item.prompt_price || 0);
        const outputPrice = parseFloat(item.output_price || item.outputPrice || item.completion_price || 0);
        
        if (model && (inputPrice > 0 || outputPrice > 0)) {
          result.models.push({
            model,
            inputPrice,
            outputPrice,
            currency: item.currency || "USD",
          });
        }
      }
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

// 解析模型价格信息
function parseModelPricing(modelData: any): { model: string; inputPrice: number; outputPrice: number; currency: string } | null {
  const model = modelData.id || modelData.model || modelData.name;
  if (!model) return null;

  // 从 pricing 字段解析
  const pricing = modelData.pricing || {};
  const inputPrice = parseFloat(pricing.prompt || pricing.input || modelData.input_price || 0);
  const outputPrice = parseFloat(pricing.completion || pricing.output || modelData.output_price || 0);

  if (inputPrice > 0 || outputPrice > 0) {
    return {
      model,
      inputPrice,
      outputPrice,
      currency: "USD",
    };
  }

  return null;
}

// 通用定价页面爬取（使用 fetch + 正则）
async function crawlGenericPricing(provider: typeof PROVIDER_PRICING_SOURCES[0]): Promise<PricingResult> {
  const result: PricingResult = {
    provider: provider.name,
    website: provider.website,
    models: [],
    crawledAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(provider.pricingUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    
    if (contentType.includes("json")) {
      // JSON API 响应
      const data = await response.json();
      const models = data.data || data.models || data;
      
      if (Array.isArray(models)) {
        for (const m of models) {
          const modelInfo = parseModelPricing(m);
          if (modelInfo) {
            result.models.push(modelInfo);
          }
        }
      }
    } else {
      // HTML 页面 - 尝试从 HTML 中提取价格信息
      const html = await response.text();
      
      // 尝试从内联 JSON 数据中提取
      const jsonMatch = html.match(/__NEXT_DATA__\s*=\s*({.+?})\s*<\/script>/s);
      if (jsonMatch) {
        try {
          const nextData = JSON.parse(jsonMatch[1]);
          // 从 Next.js 数据中提取价格
          extractFromNextData(nextData, result);
        } catch {}
      }

      // 尝试从 API 调用中提取
      const apiMatch = html.match(/\/api\/(?:pricing|models)[^"']*/g);
      if (apiMatch && result.models.length === 0) {
        const apiPath = apiMatch[0];
        const fullUrl = apiPath.startsWith("http") ? apiPath : `${provider.website}${apiPath}`;
        
        const apiResp = await fetch(fullUrl, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        
        if (apiResp.ok) {
          const apiData = await apiResp.json();
          const models = apiData.data || apiData.models || apiData;
          if (Array.isArray(models)) {
            for (const m of models) {
              const modelInfo = parseModelPricing(m);
              if (modelInfo) result.models.push(modelInfo);
            }
          }
        }
      }
    }

    return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

function extractFromNextData(data: any, result: PricingResult) {
  // 递归查找包含模型价格的数据
  function findModels(obj: any, depth = 0): any[] {
    if (depth > 5) return [];
    if (!obj || typeof obj !== "object") return [];
    
    if (Array.isArray(obj) && obj.length > 0 && obj[0]?.model) {
      return obj;
    }
    
    for (const key of Object.keys(obj)) {
      if (["props", "pageProps", "data", "models", "pricing"].includes(key)) {
        const found = findModels(obj[key], depth + 1);
        if (found.length > 0) return found;
      }
    }
    return [];
  }

  const models = findModels(data);
  for (const m of models) {
    const modelInfo = parseModelPricing(m);
    if (modelInfo) result.models.push(modelInfo);
  }
}

// 主函数
async function main() {
  console.log("=== 价格采集爬虫 ===\n");

  const results: PricingResult[] = [];

  for (const provider of PROVIDER_PRICING_SOURCES) {
    console.log(`\n📡 采集 ${provider.name} (${provider.pricingUrl})...`);
    
    let result: PricingResult;
    
    if (provider.type === "new-api" || provider.type === "one-api") {
      result = await crawlNewApiPricing(provider);
    } else {
      result = await crawlGenericPricing(provider);
    }

    if (result.error) {
      console.log(`  ❌ 失败: ${result.error}`);
    } else {
      console.log(`  ✅ 成功: ${result.models.length} 个模型`);
      for (const m of result.models.slice(0, 5)) {
        console.log(`     - ${m.model}: $${m.inputPrice}/$${m.outputPrice} per 1M tokens`);
      }
      if (result.models.length > 5) {
        console.log(`     ... 还有 ${result.models.length - 5} 个模型`);
      }
    }

    results.push(result);
  }

  // 输出汇总
  console.log("\n=== 采集汇总 ===");
  const success = results.filter(r => !r.error && r.models.length > 0);
  const failed = results.filter(r => r.error);
  
  console.log(`成功: ${success.length} 家`);
  console.log(`失败: ${failed.length} 家`);
  
  let totalModels = 0;
  for (const r of success) {
    totalModels += r.models.length;
  }
  console.log(`总模型数: ${totalModels}`);

  // 保存结果
  const outputPath = "data/pricing-results.json";
  const fs = await import("fs");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n结果已保存到 ${outputPath}`);
}

main().catch(console.error);
