/**
 * 价格采集爬虫 v2 - 使用浏览器采集真实价格
 * 
 * 策略：
 * 1. 用浏览器访问定价页面
 * 2. 等待表格加载
 * 3. 从 DOM 中提取价格数据
 * 
 * 用法: npx tsx scripts/crawl-pricing-v2.ts
 */

interface PricingModel {
  model: string;
  inputPrice: number;
  outputPrice: number;
  currency: string;
  inputCachePrice?: number;
}

interface ProviderPricing {
  provider: string;
  website: string;
  pricingUrl: string;
  models: PricingModel[];
  crawledAt: string;
  error?: string;
}

// 从数据库中获取所有有 website 的商家
async function getProvidersFromDb(): Promise<{ id: string; name: string; website: string }[]> {
  // 直接从 JSON 文件读取（因为本地无法连接数据库）
  const fs = await import("fs");
  const path = await import("path");
  const jsonPath = path.join(process.cwd(), "data/providers.json");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  
  return data
    .filter((p: any) => p.website)
    .map((p: any) => ({ id: p.id, name: p.name, website: p.website }));
}

// 已知定价页面 URL 模式
const PRICING_URL_PATTERNS = [
  "/pricing",
  "/token",
  "/model",
  "/models",
  "/price",
  "/api/pricing",
  "/#/pricing",
];

// 已知使用 New API / One API 的商家及其定价页面
const KNOWN_PROVIDERS: { name: string; website: string; pricingUrl: string }[] = [
  { name: "球球Token", website: "https://qiuqiutoken.com", pricingUrl: "https://qiuqiutoken.com/pricing" },
];

// 使用 fetch + cheerio 解析定价页面
async function crawlPricingWithFetch(url: string): Promise<{ models: PricingModel[]; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return { models: [], error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const models: PricingModel[] = [];

    // 方法1: 从 HTML 中提取内联 JSON 数据（Next.js / React 应用常用）
    const nextDataMatch = html.match(/__NEXT_DATA__\s*=\s*({.+?})\s*<\/script>/s);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        const extracted = extractModelsFromJson(nextData);
        if (extracted.length > 0) return { models: extracted };
      } catch {}
    }

    // 方法2: 从 window.__INITIAL_STATE__ 或类似全局变量中提取
    const stateMatch = html.match(/window\.__\w+__\s*=\s*({.+?});?\s*<\/script>/s);
    if (stateMatch) {
      try {
        const stateData = JSON.parse(stateMatch[1]);
        const extracted = extractModelsFromJson(stateData);
        if (extracted.length > 0) return { models: extracted };
      } catch {}
    }

    // 方法3: 用正则从 HTML 中提取价格数据
    // 匹配包含模型名和价格的文本块
    // New API / One API 系统通常在 HTML 中嵌入 JSON 数据
    const jsonBlocks = html.match(/"(?:model_name|model|id)":\s*"(gpt|claude|gemini|deepseek|qwen|glm|llama|mistral|doubao)[^"]*"/gi);
    if (jsonBlocks) {
      // 找到包含模型数据的 JSON 块
      for (const block of jsonBlocks) {
        // 尝试找到包含价格信息的完整 JSON 对象
        const startIdx = html.indexOf(block);
        const context = html.substring(Math.max(0, startIdx - 200), startIdx + 500);
        
        const inputMatch = context.match(/"(?:input_price|inputPrice|prompt_price|prompt)":\s*([\d.]+)/);
        const outputMatch = context.match(/"(?:output_price|outputPrice|completion_price|completion)":\s*([\d.]+)/);
        
        if (inputMatch || outputMatch) {
          const modelName = block.match(/"(?:model_name|model|id)":\s*"([^"]+)"/)?.[1]?.toLowerCase();
          if (modelName) {
            models.push({
              model: modelName,
              inputPrice: parseFloat(inputMatch?.[1] || 0),
              outputPrice: parseFloat(outputMatch?.[1] || 0),
              currency: "USD",
            });
          }
        }
      }
    }

    // 方法4: 从 HTML 文本中直接匹配价格模式
    if (models.length === 0) {
      // 移除 HTML 标签
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      
      // 匹配 "模型名 ... $X.XX / 1M ... $Y.YY / 1M" 模式
      const pricePattern = /((?:gpt|claude|gemini|deepseek|qwen|glm|llama|mistral|doubao)[\w.-]*)\s.*?\$(\d+\.?\d*)\s*\/\s*1M.*?\$(\d+\.?\d*)\s*\/\s*1M/gi;
      let match;
      while ((match = pricePattern.exec(text)) !== null) {
        const model = match[1].toLowerCase();
        if (!models.find(m => m.model === model)) {
          models.push({
            model,
            inputPrice: parseFloat(match[2]),
            outputPrice: parseFloat(match[3]),
            currency: "USD",
          });
        }
      }
    }

    return { models };
  } catch (error) {
    return { models: [], error: error instanceof Error ? error.message : String(error) };
  }
}

// 从 JSON 数据中递归提取模型价格
function extractModelsFromJson(data: any, depth = 0): PricingModel[] {
  if (depth > 8 || !data || typeof data !== "object") return [];
  
  const results: PricingModel[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        // 检查是否是模型数据
        const model = item.model_name || item.model || item.id || item.name;
        if (model && typeof model === "string" && /gpt|claude|gemini|deepseek|qwen/i.test(model)) {
          const inputPrice = parseFloat(item.input_price || item.inputPrice || item.prompt_price || item.prompt || 0);
          const outputPrice = parseFloat(item.output_price || item.outputPrice || item.completion_price || item.completion || 0);
          
          if (inputPrice > 0 || outputPrice > 0) {
            results.push({
              model: model.toLowerCase(),
              inputPrice,
              outputPrice,
              currency: item.currency || "USD",
              inputCachePrice: parseFloat(item.cache_price || item.inputCachePrice || 0) || undefined,
            });
          }
        }
        
        // 递归搜索
        const subResults = extractModelsFromJson(item, depth + 1);
        results.push(...subResults);
      }
    }
  } else {
    for (const key of Object.keys(data)) {
      const subResults = extractModelsFromJson(data[key], depth + 1);
      results.push(...subResults);
    }
  }

  return results;
}

// 从文本中提取价格
function extractPrices(text: string): { inputPrice: number; outputPrice: number; currency: string } | null {
  // 匹配价格模式: $1.75 / 1M, ¥12.5/百万, 1.75/1M
  const patterns = [
    /\$(\d+\.?\d*)\s*\/\s*1M.*?\$(\d+\.?\d*)\s*\/\s*1M/i,
    /(\d+\.?\d*)\s*\/\s*1M.*?(\d+\.?\d*)\s*\/\s*1M/i,
    /输入.*?(\d+\.?\d*).*?输出.*?(\d+\.?\d*)/i,
    /input.*?(\d+\.?\d*).*?output.*?(\d+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        inputPrice: parseFloat(match[1]),
        outputPrice: parseFloat(match[2]),
        currency: text.includes("¥") || text.includes("CNY") ? "CNY" : "USD",
      };
    }
  }

  return null;
}

// 尝试多个 URL 模式找到定价页面
async function findPricingPage(website: string): Promise<string | null> {
  // 先尝试已知模式
  for (const pattern of PRICING_URL_PATTERNS) {
    const url = `${website.replace(/\/$/, "")}${pattern}`;
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return url;
    } catch {}
  }
  return null;
}

// 主函数
async function main() {
  console.log("=== 价格采集爬虫 v2 ===\n");

  const results: ProviderPricing[] = [];

  // 1. 采集已知商家
  console.log("--- 采集已知商家 ---");
  for (const provider of KNOWN_PROVIDERS) {
    console.log(`\n📡 ${provider.name}: ${provider.pricingUrl}`);
    const { models, error } = await crawlPricingWithFetch(provider.pricingUrl);
    
    if (error) {
      console.log(`  ❌ ${error}`);
    } else if (models.length === 0) {
      console.log(`  ⚠️ 页面未找到价格数据（可能需要 JS 渲染）`);
    } else {
      console.log(`  ✅ ${models.length} 个模型`);
      for (const m of models.slice(0, 5)) {
        console.log(`     ${m.model}: $${m.inputPrice}/$${m.outputPrice} per 1M`);
      }
    }

    results.push({
      provider: provider.name,
      website: provider.website,
      pricingUrl: provider.pricingUrl,
      models,
      crawledAt: new Date().toISOString(),
      error,
    });
  }

  // 2. 探测其他商家的定价页面
  console.log("\n--- 探测其他商家定价页面 ---");
  const providers = await getProvidersFromDb();
  
  // 排除已知商家
  const knownWebsites = new Set(KNOWN_PROVIDERS.map(p => p.website));
  const unknownProviders = providers.filter(p => !knownWebsites.has(p.website));
  
  console.log(`共 ${unknownProviders.length} 个商家待探测\n`);

  for (const provider of unknownProviders.slice(0, 20)) {
    process.stdout.write(`  ${provider.name}: `);
    const pricingUrl = await findPricingPage(provider.website);
    
    if (!pricingUrl) {
      console.log("未找到定价页面");
      continue;
    }
    
    console.log(`找到 ${pricingUrl}`);
    const { models, error } = await crawlPricingWithFetch(pricingUrl);
    
    if (error) {
      console.log(`    ❌ ${error}`);
    } else if (models.length > 0) {
      console.log(`    ✅ ${models.length} 个模型`);
      results.push({
        provider: provider.name,
        website: provider.website,
        pricingUrl,
        models,
        crawledAt: new Date().toISOString(),
      });
    } else {
      console.log(`    ⚠️ 未提取到价格数据`);
    }
  }

  // 汇总
  console.log("\n=== 采集汇总 ===");
  const success = results.filter(r => r.models.length > 0);
  console.log(`成功采集: ${success.length} 家`);
  let totalModels = 0;
  for (const r of success) {
    totalModels += r.models.length;
    console.log(`  ${r.provider}: ${r.models.length} 个模型`);
  }
  console.log(`总模型数: ${totalModels}`);

  // 保存结果
  const fs = await import("fs");
  fs.writeFileSync("data/pricing-results.json", JSON.stringify(results, null, 2));
  console.log(`\n结果已保存到 data/pricing-results.json`);
}

main().catch(console.error);
