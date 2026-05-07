import { Provider, Stats, CommunityPost } from "@/lib/types";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

function readProvidersFile(): Provider[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      const data = fs.readFileSync(PROVIDERS_FILE, "utf-8");
      return JSON.parse(data) as Provider[];
    }
  } catch (error) {
    console.error("[Data] Error reading providers.json:", error);
  }
  return [];
}

function readStatsFile(): Stats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf-8");
      return JSON.parse(data) as Stats;
    }
  } catch (error) {
    console.error("[Data] Error reading stats.json:", error);
  }
  return {
    totalProviders: 0,
    onlineProviders: 0,
    todayNew: 0,
    lowestPrice: { model: "", price: 0, provider: "" },
    modelCoverage: [],
    priceDistribution: [],
    sourceDistribution: [],
    dailyTrend: [],
  };
}

export function getProviders(): Provider[] {
  return readProvidersFile();
}

export function getProviderById(id: string): Provider | undefined {
  return readProvidersFile().find((p) => p.id === id);
}

export function getStats(): Stats {
  // 从 providers.json 动态计算统计数据
  const providers = readProvidersFile();
  
  if (providers.length === 0) {
    return readStatsFile(); // 如果没有数据，返回 stats.json 的默认值
  }
  
  // 计算总商家数
  const totalProviders = providers.length;
  
  // 计算在线商家数（假设所有有网站的商家都是在线的）
  const onlineProviders = providers.filter(p => p.website && p.website.startsWith("http")).length;
  
  // 计算今日新增（24小时内）- 使用 firstSeen 字段
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayNew = providers.filter(p => {
    const addedDate = new Date(p.firstSeen);
    return addedDate >= todayStart;
  }).length;
  
  // 计算最低价格
  let lowestPrice = { model: "", price: Infinity, provider: "" };
  providers.forEach(p => {
    p.models.forEach(m => {
      if (m.inputPrice > 0 && m.inputPrice < lowestPrice.price) {
        lowestPrice = {
          model: m.model,
          price: m.inputPrice,
          provider: p.name
        };
      }
    });
  });
  
  // 如果没有找到价格，返回空值
  if (lowestPrice.price === Infinity) {
    lowestPrice = { model: "", price: 0, provider: "" };
  }
  
  // 计算模型覆盖
  const modelCount: Record<string, number> = {};
  providers.forEach(p => {
    p.models.forEach(m => {
      const modelName = m.model.toLowerCase();
      modelCount[modelName] = (modelCount[modelName] || 0) + 1;
    });
  });
  const modelCoverage = Object.entries(modelCount)
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // 计算价格分布
  const priceRanges = [
    { range: "0-1", min: 0, max: 1, count: 0 },
    { range: "1-3", min: 1, max: 3, count: 0 },
    { range: "3-5", min: 3, max: 5, count: 0 },
    { range: "5-10", min: 5, max: 10, count: 0 },
    { range: "10+", min: 10, max: Infinity, count: 0 },
  ];
  providers.forEach(p => {
    p.models.forEach(m => {
      if (m.inputPrice > 0) {
        const range = priceRanges.find(r => m.inputPrice >= r.min && m.inputPrice < r.max);
        if (range) range.count++;
      }
    });
  });
  const priceDistribution = priceRanges.filter(r => r.count > 0);
  
  // 计算来源分布
  const sourceCount: Record<string, number> = {};
  providers.forEach(p => {
    p.sources.forEach(s => {
      sourceCount[s.platform] = (sourceCount[s.platform] || 0) + 1;
    });
  });
  const sourceDistribution = Object.entries(sourceCount)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
  
  // 计算每日趋势（最近7天）- 使用 firstSeen 字段
  const dailyTrend: { date: string; newProviders: number; priceChanges: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const count = providers.filter(p => {
      const addedDate = new Date(p.firstSeen).toISOString().split("T")[0];
      return addedDate === dateStr;
    }).length;
    dailyTrend.push({ date: dateStr, newProviders: count, priceChanges: 0 });
  }
  
  return {
    totalProviders,
    onlineProviders,
    todayNew,
    lowestPrice,
    modelCoverage,
    priceDistribution,
    sourceDistribution,
    dailyTrend,
  };
}

export function getCommunityPosts(): CommunityPost[] {
  const providers = getProviders();
  const posts: CommunityPost[] = [];
  providers.forEach((p) => {
    p.sources.forEach((s) => {
      posts.push({
        platform: s.platform,
        title: s.title,
        author: s.author,
        publishedAt: s.publishedAt,
        url: s.url,
        snippet: `来自 ${p.name} 的相关讨论`,
      });
    });
  });
  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function searchProviders(query: string): Provider[] {
  const q = query.toLowerCase();
  return getProviders().filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.models.some((m) => m.model.toLowerCase().includes(q)) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function filterProviders(options: {
  model?: string;
  billingType?: string;
  status?: string;
  platform?: string;
  minPrice?: number;
  maxPrice?: number;
}): Provider[] {
  let result = getProviders();
  if (options.model) {
    result = result.filter((p) =>
      p.models.some((m) =>
        m.model.toLowerCase().includes(options.model!.toLowerCase())
      )
    );
  }
  if (options.billingType) {
    result = result.filter((p) => p.billingType === options.billingType);
  }
  if (options.status) {
    result = result.filter((p) => p.status === options.status);
  }
  if (options.platform) {
    result = result.filter((p) =>
      p.sources.some((s) => s.platform === options.platform)
    );
  }
  if (options.minPrice !== undefined) {
    result = result.filter((p) =>
      p.models.some((m) => m.inputPrice >= options.minPrice!)
    );
  }
  if (options.maxPrice !== undefined) {
    result = result.filter((p) =>
      p.models.some((m) => m.inputPrice <= options.maxPrice!)
    );
  }
  return result;
}
