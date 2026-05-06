import { ExtractedProvider } from "./types";
import { Provider } from "../../src/lib/types";

// 计算两个字符串的相似度 (0-1)
function similarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // 简单的编辑距离
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

// 判断两个商家是否为同一商家
function isSameProvider(p1: ExtractedProvider | Provider, p2: ExtractedProvider | Provider): boolean {
  // 名称相似度
  const nameSim = similarity(p1.name, p2.name);
  if (nameSim > 0.85) return true;

  // 网站相同
  if ("website" in p1 && "website" in p2 && p1.website && p2.website) {
    const url1 = p1.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const url2 = p2.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (url1 === url2) return true;
  }

  // 联系方式相同
  if ("contact" in p1 && "contact" in p2 && p1.contact && p2.contact) {
    if (similarity(p1.contact, p2.contact) > 0.9) return true;
  }

  return false;
}

// 合并两个商家的信息
function mergeProviders(
  existing: Provider,
  extracted: ExtractedProvider,
  newSource: { platform: string; url: string; title: string; author: string; publishedAt: string }
): Provider {
  const now = new Date().toISOString();

  // 合并模型价格（优先保留价格信息更全的）
  const mergedModels = [...existing.models];
  for (const newModel of extracted.models) {
    const idx = mergedModels.findIndex(m =>
      similarity(m.model, newModel.model) > 0.8
    );
    if (idx >= 0) {
      // 更新价格（如果新数据有价格）
      if (newModel.inputPrice !== undefined) {
        mergedModels[idx].inputPrice = newModel.inputPrice;
      }
      if (newModel.outputPrice !== undefined) {
        mergedModels[idx].outputPrice = newModel.outputPrice;
      }
    } else {
      mergedModels.push({
        model: newModel.model,
        inputPrice: newModel.inputPrice || 0,
        outputPrice: newModel.outputPrice || 0,
        currency: newModel.currency || "CNY",
      });
    }
  }

  // 合并来源
  const existingSources = new Set(existing.sources.map(s => s.url));
  const newSources = existing.sources.slice();
  if (!existingSources.has(newSource.url)) {
    newSources.push({
      platform: newSource.platform,
      url: newSource.url,
      title: newSource.title,
      author: newSource.author,
      publishedAt: newSource.publishedAt,
      fetchedAt: now,
    });
  }

  // 更新热度
  const newHeatScore = Math.min(100, existing.heatScore + 2);
  const newMentionCount = existing.mentionCount + 1;

  return {
    ...existing,
    models: mergedModels,
    sources: newSources,
    heatScore: newHeatScore,
    mentionCount: newMentionCount,
    lastUpdated: now,
    // 更新其他字段（如果新数据有）
    billingType: extracted.billingType || existing.billingType,
    subscription: extracted.subscriptionPlans ? { plans: extracted.subscriptionPlans } : existing.subscription,
    freeQuota: extracted.freeQuota || existing.freeQuota,
    paymentMethods: extracted.paymentMethods || existing.paymentMethods,
    concurrencyLimit: extracted.concurrencyLimit || existing.concurrencyLimit,
    rateLimit: extracted.rateLimit || existing.rateLimit,
    tags: mergeTags(existing.tags, extracted.tags || []),
  };
}

function mergeTags(existing: string[], newTags: string[]): string[] {
  const all = [...existing, ...newTags];
  return [...new Set(all)].slice(0, 5); // 最多5个标签
}

// 将提取的数据转换为 Provider 格式
function extractedToProvider(
  extracted: ExtractedProvider,
  source: { platform: string; url: string; title: string; author: string; publishedAt: string }
): Provider {
  const now = new Date().toISOString();
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  return {
    id,
    name: extracted.name,
    website: extracted.website || "",
    contact: extracted.contact || "",
    models: extracted.models.map(m => ({
      model: m.model,
      inputPrice: m.inputPrice || 0,
      outputPrice: m.outputPrice || 0,
      currency: m.currency || "CNY",
    })),
    billingType: extracted.billingType || "token",
    subscription: extracted.subscriptionPlans ? { plans: extracted.subscriptionPlans } : undefined,
    freeQuota: extracted.freeQuota,
    paymentMethods: extracted.paymentMethods || [],
    concurrencyLimit: extracted.concurrencyLimit,
    rateLimit: extracted.rateLimit,
    status: "unknown",
    lastChecked: now,
    heatScore: Math.round(extracted.confidence * 50), // 初始热度基于置信度
    mentionCount: 1,
    priceHistory: [],
    sources: [{
      platform: source.platform,
      url: source.url,
      title: source.title,
      author: source.author,
      publishedAt: source.publishedAt,
      fetchedAt: now,
    }],
    firstSeen: now,
    lastUpdated: now,
    tags: extracted.tags?.slice(0, 5) || ["新商家"],
  };
}

// 主去重合并函数
export function deduplicateAndMerge(
  extractedList: { extracted: ExtractedProvider | null; source: { platform: string; url: string; title: string; author: string; publishedAt: string } }[],
  existingProviders: Provider[]
): { providers: Provider[]; newCount: number; updatedCount: number } {
  const providers = [...existingProviders];
  let newCount = 0;
  let updatedCount = 0;

  for (const item of extractedList) {
    if (!item.extracted) continue;

    const { extracted, source } = item;

    // 查找是否已存在
    const existingIndex = providers.findIndex(p => isSameProvider(p, extracted));

    if (existingIndex >= 0) {
      // 合并现有商家
      providers[existingIndex] = mergeProviders(
        providers[existingIndex],
        extracted,
        source
      );
      updatedCount++;
    } else {
      // 新增商家
      const newProvider = extractedToProvider(extracted, source);
      providers.push(newProvider);
      newCount++;
    }
  }

  return { providers, newCount, updatedCount };
}
