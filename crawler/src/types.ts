// 爬虫相关类型定义

export interface RawPost {
  url: string;
  platform: string;
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
}

export interface ExtractedProvider {
  name: string;
  website?: string;
  contact?: string;
  models: {
    model: string;
    inputPrice?: number;
    outputPrice?: number;
    currency?: string;
  }[];
  billingType?: "token" | "subscription" | "hybrid";
  subscriptionPlans?: {
    name: string;
    price: number;
    period: string;
    features: string[];
  }[];
  freeQuota?: {
    amount: number;
    unit: string;
  };
  paymentMethods?: string[];
  concurrencyLimit?: number;
  rateLimit?: string;
  tags?: string[];
  confidence: number; // AI 提取置信度 0-1
}

export interface CrawlerConfig {
  name: string;
  platform: string;
  keywords: string[];
  schedule: string; // cron 表达式
  enabled: boolean;
  maxConcurrency: number;
  requestInterval: number; // ms
}

export interface CrawlerResult {
  platform: string;
  postsFound: number;
  postsNew: number;
  errors: string[];
  duration: number; // ms
}
