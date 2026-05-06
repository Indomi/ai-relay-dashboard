import { Provider, Stats, CommunityPost } from "@/lib/types";

// 动态导入 fs 模块（仅在服务端）
async function getFsModule() {
  if (typeof window === "undefined") {
    const fs = await import("fs");
    const path = await import("path");
    return { fs, path };
  }
  return null;
}

// 运行时动态读取 providers.json
async function readProvidersFile(): Promise<Provider[]> {
  const modules = await getFsModule();
  if (!modules) return [];

  const { fs, path } = modules;
  const DATA_DIR = path.join(process.cwd(), "data");
  const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");

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
async function readStatsFile(): Promise<Stats> {
  const modules = await getFsModule();
  if (!modules) {
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

  const { fs, path } = modules;
  const DATA_DIR = path.join(process.cwd(), "data");
  const STATS_FILE = path.join(DATA_DIR, "stats.json");

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

// 缓存数据（构建时读取一次）
let cachedProviders: Provider[] | null = null;
let cachedStats: Stats | null = null;

export async function getProviders(): Promise<Provider[]> {
  if (!cachedProviders) {
    cachedProviders = await readProvidersFile();
  }
  return cachedProviders;
}

export async function getProviderById(id: string): Promise<Provider | undefined> {
  const providers = await getProviders();
  return providers.find((p) => p.id === id);
}

export async function getStats(): Promise<Stats> {
  if (!cachedStats) {
    cachedStats = await readStatsFile();
  }
  return cachedStats;
}

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const providers = await getProviders();
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

export async function searchProviders(query: string): Promise<Provider[]> {
  const q = query.toLowerCase();
  const providers = await getProviders();
  return providers.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.models.some((m) => m.model.toLowerCase().includes(q)) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export async function filterProviders(options: {
  model?: string;
  billingType?: string;
  status?: string;
  platform?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<Provider[]> {
  let result = await getProviders();
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
