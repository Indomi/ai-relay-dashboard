import { Provider, Stats } from "@/lib/types";
import providersData from "@/../public/data/providers.json";

// 将 JSON 数据转换为 Provider 类型
function jsonToProvider(data: any): Provider {
  return {
    id: data.id,
    name: data.name,
    website: data.website || "",
    contact: data.contact || "",
    models: (data.models || []).map((m: any) => ({
      model: m.model,
      inputPrice: m.inputPrice || 0,
      outputPrice: m.outputPrice || 0,
      currency: m.currency || "CNY",
    })),
    billingType: data.billingType || "token",
    subscription: data.subscription,
    freeQuota: data.freeQuota,
    paymentMethods: data.paymentMethods || [],
    concurrencyLimit: data.concurrencyLimit,
    rateLimit: data.rateLimit,
    status: data.status || "unknown",
    lastChecked: data.lastChecked,
    responseTime: data.responseTime,
    heatScore: data.heatScore || 0,
    mentionCount: data.mentionCount || 0,
    priceHistory: data.priceHistory || [],
    sources: (data.sources || []).map((s: any) => ({
      platform: s.platform,
      title: s.title,
      url: s.url,
      author: s.author || "",
      publishedAt: s.publishedAt,
      fetchedAt: s.fetchedAt,
    })),
    firstSeen: data.firstSeen,
    lastUpdated: data.lastUpdated,
    tags: data.tags || [],
    // 新增字段
    signupBonus: data.signupBonus,
    termsUrl: data.termsUrl,
    termsSummary: data.termsSummary,
    refundSupport: data.refundSupport,
    refundCondition: data.refundCondition,
    compensationPolicy: data.compensationPolicy,
    supportChannels: data.supportChannels,
    serviceHours: data.serviceHours,
    minTopup: data.minTopup,
    canInvoice: data.canInvoice,
    requiresLogin: data.requiresLogin,
  };
}

export async function getProviders(): Promise<Provider[]> {
  try {
    const providers = (providersData as any[]).map(jsonToProvider);
    console.log("[JSON] Loaded", providers.length, "providers from JSON");
    return providers;
  } catch (error) {
    console.error("[JSON] Error loading providers:", error);
    return [];
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  try {
    const data = (providersData as any[]).find((p) => p.id === id);
    return data ? jsonToProvider(data) : null;
  } catch (error) {
    console.error("[JSON] Error loading provider:", error);
    return null;
  }
}

export async function getStats(): Promise<Stats> {
  try {
    const providers = await getProviders();
    const total = providers.length;
    const online = providers.filter((p) => p.status === "online").length;
    
    // 今日新增
    const today = new Date().toISOString().split("T")[0];
    const todayNew = providers.filter(
      (p) => p.firstSeen?.split("T")[0] === today
    ).length;

    // 最低价格
    let lowestPrice = { model: "", price: 0, provider: "" };
    let minPriceVal = Infinity;
    for (const p of providers) {
      for (const m of p.models) {
        if (m.inputPrice && m.inputPrice > 0 && m.inputPrice < minPriceVal) {
          minPriceVal = m.inputPrice;
          lowestPrice = { model: m.model, price: m.inputPrice, provider: p.name };
        }
      }
    }

    // 模型覆盖
    const modelCount: Record<string, number> = {};
    for (const p of providers) {
      for (const m of p.models) {
        const key = m.model.toLowerCase();
        modelCount[key] = (modelCount[key] || 0) + 1;
      }
    }
    const modelCoverage = Object.entries(modelCount)
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 价格分布
    const priceRanges = [
      { range: "0-1", min: 0, max: 1, count: 0 },
      { range: "1-3", min: 1, max: 3, count: 0 },
      { range: "3-5", min: 3, max: 5, count: 0 },
      { range: "5-10", min: 5, max: 10, count: 0 },
      { range: "10+", min: 10, max: Infinity, count: 0 },
    ];
    for (const p of providers) {
      for (const m of p.models) {
        if (m.inputPrice && m.inputPrice > 0) {
          const range = priceRanges.find((r) => m.inputPrice! >= r.min && m.inputPrice! < r.max);
          if (range) range.count++;
        }
      }
    }

    // 来源分布
    const sourceCount: Record<string, number> = {};
    for (const p of providers) {
      for (const s of p.sources) {
        sourceCount[s.platform] = (sourceCount[s.platform] || 0) + 1;
      }
    }
    const sourceDistribution = Object.entries(sourceCount)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count);

    // 每日趋势
    const dailyTrend: { date: string; newProviders: number; priceChanges: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const count = providers.filter(
        (p) => p.firstSeen?.split("T")[0] === dateStr
      ).length;
      dailyTrend.push({ date: dateStr, newProviders: count, priceChanges: 0 });
    }

    return {
      totalProviders: total,
      onlineProviders: online,
      todayNew,
      lowestPrice,
      modelCoverage,
      priceDistribution: priceRanges.filter((r) => r.count > 0),
      sourceDistribution,
      dailyTrend,
    };
  } catch (error) {
    console.error("[JSON] Error computing stats:", error);
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
}

export async function searchProviders(query: string): Promise<Provider[]> {
  try {
    const providers = await getProviders();
    const lowerQuery = query.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.models.some((m) => m.model.toLowerCase().includes(lowerQuery))
    );
  } catch (error) {
    console.error("[JSON] Error searching providers:", error);
    return [];
  }
}
