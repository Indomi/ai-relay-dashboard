export interface ModelPricing {
  model: string;
  inputPrice: number;
  outputPrice: number;
  currency: string;
}

export interface SubscriptionPlan {
  name: string;
  price: number;
  period: string;
  features: string[];
}

export interface Source {
  platform: string;
  url: string;
  title: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface PriceHistoryEntry {
  date: string;
  model: string;
  price: number;
}

export interface Provider {
  id: string;
  name: string;
  website: string;
  contact: string;
  models: ModelPricing[];
  billingType: "token" | "subscription" | "hybrid";
  subscription?: {
    plans: SubscriptionPlan[];
  };
  freeQuota?: {
    amount: number;
    unit: string;
  };
  paymentMethods: string[];
  concurrencyLimit?: number;
  rateLimit?: string;
  status: "online" | "offline" | "unknown";
  lastChecked: string;
  responseTime?: number;
  heatScore: number;
  mentionCount: number;
  priceHistory: PriceHistoryEntry[];
  sources: Source[];
  firstSeen: string;
  lastUpdated: string;
  tags: string[];
}

export interface Stats {
  totalProviders: number;
  onlineProviders: number;
  todayNew: number;
  lowestPrice: {
    model: string;
    price: number;
    provider: string;
  };
  modelCoverage: {
    model: string;
    count: number;
  }[];
  priceDistribution: {
    range: string;
    count: number;
  }[];
  sourceDistribution: {
    platform: string;
    count: number;
  }[];
  dailyTrend: {
    date: string;
    newProviders: number;
    priceChanges: number;
  }[];
}

export interface CommunityPost {
  platform: string;
  title: string;
  author: string;
  publishedAt: string;
  url: string;
  snippet: string;
}
