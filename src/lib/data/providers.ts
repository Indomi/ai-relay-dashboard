import { Provider, Stats, CommunityPost } from "@/lib/types";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

// 运行时动态读取 providers.json
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

// 运行时动态读取 stats.json
function readStatsFile(): Stats {
  try {
    if (fs.existsSync(STATS_FILE)) {
      const data = fs.readFileSync(STATS_FILE, "utf-8");
      return JSON.parse(data) as Stats;
    }
  } catch (error) {
    console.error("[Data] Error reading stats.json:", error);
  }
  // 返回默认统计
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
  return readStatsFile();
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
