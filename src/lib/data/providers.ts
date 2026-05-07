import { Provider, Stats, CommunityPost } from "@/lib/types";
import * as fs from "fs";
import * as path from "path";

// 数据文件路径 - 尝试多个位置
const DATA_PATHS = [
  path.join(process.cwd(), "public/data"),
  path.join(process.cwd(), "data"),
  path.join(__dirname, "../../../../public/data"),
  path.join(__dirname, "../../../public/data"),
  "/var/task/public/data",
];

function getDataDir(): string {
  for (const dir of DATA_PATHS) {
    try {
      const testFile = path.join(dir, "providers.json");
      if (fs.existsSync(testFile)) {
        console.log("[Data] Found data at:", dir);
        return dir;
      }
    } catch {
      // continue
    }
  }
  console.log("[Data] No data directory found, returning first path");
  return DATA_PATHS[0];
}

const DATA_DIR = getDataDir();
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

console.log("[Data] DATA_DIR:", DATA_DIR);
console.log("[Data] PROVIDERS_FILE:", PROVIDERS_FILE);
console.log("[Data] File exists:", fs.existsSync(PROVIDERS_FILE));

function readProvidersFile(): Provider[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      const data = fs.readFileSync(PROVIDERS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      console.log("[Data] Loaded", parsed.length, "providers");
      return parsed as Provider[];
    }
  } catch (error) {
    console.error("[Data] Error reading providers:", error);
  }
  console.log("[Data] No providers loaded, returning empty array");
  return [];
}

function readStatsFile(): Stats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf-8");
      return JSON.parse(data) as Stats;
    }
  } catch (error) {
    console.error("[Data] Error reading stats:", error);
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
  return getProviders().find((p) => p.id === id);
}

export function getStats(): Stats {
  // 从 providers.json 动态计算统计数据
  const providers = getProviders();
  
  if (providers.length === 0) {
    return readStatsFile();
  }
  
  const totalProviders = providers.length;
  const onlineProviders = providers.filter(p => p.website && p.website.startsWith("http")).length;
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayNew = providers.filter(p => {
    const addedDate = new Date(p.firstSeen);
    return addedDate >= todayStart;
  }).length;
  
  let lowestPrice = { model: "", price: Infinity, provider: "" };
  providers.forEach(p => {
    p.models.forEach(m => {
      if (m.inputPrice > 0 && m.inputPrice < lowestPrice.price) {
        lowestPrice = { model: m.model, price: m.inputPrice, provider: p.name };
      }
    });
  });
  if (lowestPrice.price === Infinity) {
    lowestPrice = { model: "", price: 0, provider: "" };
  }
  
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
  
  const sourceCount: Record<string, number> = {};
  providers.forEach(p => {
    p.sources.forEach(s => {
      sourceCount[s.platform] = (sourceCount[s.platform] || 0) + 1;
    });
  });
  const sourceDistribution = Object.entries(sourceCount)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);
  
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
