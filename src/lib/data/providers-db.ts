import { prisma } from "@/lib/db";
import { Provider, Stats } from "@/lib/types";

// 将数据库记录转换为前端 Provider 类型
function dbToProvider(db: any): Provider {
  // 解析 supportChannels JSON 字符串为数组
  let supportChannels: string[] | undefined;
  if (db.payment?.supportChannels) {
    try {
      supportChannels = JSON.parse(db.payment.supportChannels);
    } catch {
      supportChannels = undefined;
    }
  }

  return {
    id: db.id,
    name: db.name,
    website: db.website || "",
    contact: db.contact || "",
    models: (db.models || []).map((m: any) => ({
      model: m.model,
      inputPrice: m.inputPrice || 0,
      outputPrice: m.outputPrice || 0,
      currency: m.currency || "CNY",
    })),
    billingType: (db.billingType as "token" | "subscription" | "hybrid") || "token",
    paymentMethods: [],
    status: (db.status as "online" | "offline" | "unknown") || "unknown",
    lastChecked: db.lastSeen?.toISOString() || new Date().toISOString(),
    responseTime: undefined,
    heatScore: db.heatScore || 0,
    mentionCount: db.mentionCount || 0,
    priceHistory: [],
    sources: (db.sources || []).map((s: any) => ({
      platform: s.platform,
      title: s.title,
      url: s.url,
      author: s.author || "",
      publishedAt: s.publishedAt?.toISOString() || new Date().toISOString(),
      fetchedAt: s.fetchedAt?.toISOString() || new Date().toISOString(),
    })),
    firstSeen: db.firstSeen?.toISOString() || new Date().toISOString(),
    lastUpdated: db.lastSeen?.toISOString() || new Date().toISOString(),
    tags: db.tags || [],
    // 新增字段
    signupBonus: db.description || undefined,
    refundSupport: db.payment?.refundSupport || undefined,
    refundCondition: db.payment?.refundCondition || undefined,
    compensationPolicy: db.payment?.refundCondition || undefined,
    supportChannels,
    serviceHours: db.payment?.serviceHours || undefined,
    minTopup: db.payment?.minTopup ?? undefined,
    canInvoice: db.payment?.canInvoice ?? undefined,
    requiresLogin: db.risk?.requiresLogin ?? false,
  };
}

export async function getProviders(): Promise<Provider[]> {
  try {
    console.log("[DB] Starting getProviders query...");
    
    const providers = await prisma.provider.findMany({
      include: {
        models: true,
        sources: { take: 10, orderBy: { fetchedAt: "desc" } },
      },
      orderBy: { heatScore: "desc" },
    });

    console.log("[DB] Fetched", providers.length, "providers from database");
    
    if (providers.length === 0) {
      console.log("[DB] Warning: No providers found in database");
    }
    
    return providers.map(dbToProvider);
  } catch (error) {
    console.error("[DB] Error reading providers:", error);
    // 返回空数组而不是抛出错误，避免页面崩溃
    return [];
  }
}

export async function getProviderById(id: string): Promise<Provider | null> {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        models: true,
        sources: { orderBy: { fetchedAt: "desc" } },
        subscriptions: true,
        payment: true,
        risk: true,
      },
    });

    return provider ? dbToProvider(provider) : null;
  } catch (error) {
    console.error("[DB] Error reading provider:", error);
    return null;
  }
}

export async function getStats(): Promise<Stats> {
  try {
    const [total, online, todayNew, providers] = await Promise.all([
      prisma.provider.count(),
      prisma.provider.count({ where: { website: { not: null } } }),
      prisma.provider.count({
        where: { firstSeen: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.provider.findMany({
        include: { models: true, sources: true },
      }),
    ]);

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
        (p: any) => p.firstSeen.toISOString().split("T")[0] === dateStr
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
    console.error("[DB] Error computing stats:", error);
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
    const providers = await prisma.provider.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { models: { some: { model: { contains: query, mode: "insensitive" } } } },
        ],
        status: { not: "inactive" },
      },
      include: {
        models: true,
        sources: { take: 5, orderBy: { fetchedAt: "desc" } },
      },
      orderBy: { heatScore: "desc" },
    });

    return providers.map(dbToProvider);
  } catch (error) {
    console.error("[DB] Error searching providers:", error);
    return [];
  }
}

// 爬虫写入数据库的函数
export async function upsertProvider(data: {
  name: string;
  website?: string;
  contact?: string;
  description?: string;
  signupBonus?: string;
  billingType?: string;
  tags?: string[];
  confidence?: number;
  models: { model: string; inputPrice?: number; outputPrice?: number; currency?: string }[];
  source: { platform: string; title: string; url: string; author?: string; publishedAt?: string };
  // SubscriptionPlan 相关
  subscriptionPlans?: { name: string; price: number; period?: string; features?: string[]; autoRenew?: boolean; refundRule?: string }[];
  // ProviderPayment 相关
  minTopup?: number;
  canInvoice?: boolean;
  refundSupport?: string;
  refundCondition?: string;
  supportChannels?: string[];
  serviceHours?: string;
  // ProviderRisk 相关
  termsUrl?: string;
  termsSummary?: string;
  requiresLogin?: boolean;
}) {
  try {
    // 查找或创建商家
    const existing = await prisma.provider.findFirst({
      where: {
        OR: [
          { name: data.name },
          ...(data.website ? [{ website: data.website }] : []),
        ],
      },
      include: { models: true, sources: true },
    });

    if (!existing) {
      const created = await prisma.provider.create({
        data: {
          name: data.name,
          website: data.website,
          contact: data.contact,
          description: data.signupBonus || data.description,
          billingType: data.billingType || "token",
          tags: data.tags || [],
          confidence: data.confidence || 0,
          heatScore: Math.round((data.confidence || 0) * 50),
          mentionCount: 1,
          models: {
            create: data.models.map((m) => ({
              model: m.model,
              inputPrice: m.inputPrice,
              outputPrice: m.outputPrice,
              currency: m.currency || "CNY",
            })),
          },
          sources: {
            create: {
              platform: data.source.platform,
              title: data.source.title,
              url: data.source.url,
              author: data.source.author,
              publishedAt: data.source.publishedAt ? new Date(data.source.publishedAt) : undefined,
            },
          },
          // SubscriptionPlan 表
          ...(data.subscriptionPlans && data.subscriptionPlans.length > 0
            ? {
                subscriptions: {
                  create: data.subscriptionPlans.map((plan) => ({
                    name: plan.name,
                    price: plan.price,
                    period: plan.period,
                    features: plan.features || [],
                    autoRenew: plan.autoRenew ?? false,
                    refundRule: plan.refundRule,
                  })),
                },
              }
            : {}),
          // ProviderPayment 表
          ...((data.minTopup !== undefined || data.canInvoice !== undefined || data.refundSupport || data.refundCondition || data.supportChannels || data.serviceHours)
            ? {
                payment: {
                  create: {
                    minTopup: data.minTopup,
                    canInvoice: data.canInvoice ?? false,
                    refundSupport: data.refundSupport || "unknown",
                    refundCondition: data.refundCondition,
                    supportChannels: data.supportChannels ? JSON.stringify(data.supportChannels) : undefined,
                    serviceHours: data.serviceHours,
                  },
                },
              }
            : {}),
          // ProviderRisk 表
          ...((data.termsUrl || data.termsSummary || data.requiresLogin !== undefined)
            ? {
                risk: {
                  create: {
                    termsClarity: data.termsSummary ? "clear" : "partial",
                    requiresLogin: data.requiresLogin ?? false,
                  },
                },
              }
            : {}),
        },
        include: { models: true, sources: true, subscriptions: true, payment: true, risk: true },
      });
      return created;
    } else {
      // 更新已有商家
      await prisma.provider.update({
        where: { id: existing.id },
        data: {
          heatScore: { increment: 2 },
          mentionCount: { increment: 1 },
          lastSeen: new Date(),
          ...(data.signupBonus || data.description
            ? { description: data.signupBonus || data.description }
            : {}),
          ...(data.confidence && data.confidence > existing.confidence
            ? { confidence: data.confidence }
            : {}),
          ...(data.tags && data.tags.length > 0 ? { tags: data.tags } : {}),
        },
      });

      // 更新模型价格
      for (const m of data.models) {
        await prisma.providerModel.upsert({
          where: { providerId_model: { providerId: existing.id, model: m.model } },
          create: {
            providerId: existing.id,
            model: m.model,
            inputPrice: m.inputPrice,
            outputPrice: m.outputPrice,
            currency: m.currency || "CNY",
          },
          update: {
            ...(m.inputPrice ? { inputPrice: m.inputPrice } : {}),
            ...(m.outputPrice ? { outputPrice: m.outputPrice } : {}),
          },
        });
      }

      // 添加新来源
      const existingUrls = existing.sources.map((s: any) => s.url);
      if (!existingUrls.includes(data.source.url)) {
        await prisma.providerSource.create({
          data: {
            providerId: existing.id,
            platform: data.source.platform,
            title: data.source.title,
            url: data.source.url,
            author: data.source.author,
            publishedAt: data.source.publishedAt ? new Date(data.source.publishedAt) : undefined,
          },
        });
      }

      // 更新 SubscriptionPlan 表
      if (data.subscriptionPlans && data.subscriptionPlans.length > 0) {
        // 先删除旧的订阅方案，再创建新的
        await prisma.subscriptionPlan.deleteMany({
          where: { providerId: existing.id },
        });
        await prisma.subscriptionPlan.createMany({
          data: data.subscriptionPlans.map((plan) => ({
            providerId: existing.id,
            name: plan.name,
            price: plan.price,
            period: plan.period,
            features: plan.features || [],
            autoRenew: plan.autoRenew ?? false,
            refundRule: plan.refundRule,
          })),
        });
      }

      // 更新 ProviderPayment 表
      if (data.minTopup !== undefined || data.canInvoice !== undefined || data.refundSupport || data.refundCondition || data.supportChannels || data.serviceHours) {
        await prisma.providerPayment.upsert({
          where: { providerId: existing.id },
          create: {
            providerId: existing.id,
            minTopup: data.minTopup,
            canInvoice: data.canInvoice ?? false,
            refundSupport: data.refundSupport || "unknown",
            refundCondition: data.refundCondition,
            supportChannels: data.supportChannels ? JSON.stringify(data.supportChannels) : undefined,
            serviceHours: data.serviceHours,
          },
          update: {
            ...(data.minTopup !== undefined ? { minTopup: data.minTopup } : {}),
            ...(data.canInvoice !== undefined ? { canInvoice: data.canInvoice } : {}),
            ...(data.refundSupport ? { refundSupport: data.refundSupport } : {}),
            ...(data.refundCondition ? { refundCondition: data.refundCondition } : {}),
            ...(data.supportChannels ? { supportChannels: JSON.stringify(data.supportChannels) } : {}),
            ...(data.serviceHours ? { serviceHours: data.serviceHours } : {}),
          },
        });
      }

      // 更新 ProviderRisk 表
      if (data.termsUrl || data.termsSummary || data.requiresLogin !== undefined) {
        await prisma.providerRisk.upsert({
          where: { providerId: existing.id },
          create: {
            providerId: existing.id,
            termsClarity: data.termsSummary ? "clear" : "partial",
            requiresLogin: data.requiresLogin ?? false,
          },
          update: {
            termsClarity: data.termsSummary ? "clear" : "partial",
            ...(data.requiresLogin !== undefined ? { requiresLogin: data.requiresLogin } : {}),
          },
        });
      }

      return existing;
    }
  } catch (error) {
    console.error("[DB] Error upserting provider:", error);
    return null;
  }
}
