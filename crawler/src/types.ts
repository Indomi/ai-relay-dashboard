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
  description?: string;

  // 模型价格
  models: {
    model: string;
    inputPrice?: number;
    outputPrice?: number;
    currency?: string;
  }[];

  // 计费模式
  billingType?: "token" | "subscription" | "hybrid";

  // 订阅方案
  subscriptionPlans?: {
    name: string;
    price: number;
    period: string;
    features: string[];
    autoRenew?: boolean;
    refundRule?: string;
  }[];

  // 免费额度 / 注册奖励
  freeQuota?: {
    amount: number;
    unit: string;
    description?: string; // 如 "新用户注册送 $1"
  };
  signupBonus?: string; // 注册奖励描述，如 "注册送5元"、"首充送20%"

  // 支付信息
  paymentMethods?: string[];
  minTopup?: number; // 最低充值金额
  canInvoice?: boolean; // 是否支持发票

  // 用户协议与服务条款
  termsUrl?: string; // 用户协议链接
  termsSummary?: string; // 协议关键条款摘要（100字以内）
  bannedModels?: string[]; // 禁用的模型或用途

  // 退款与补偿政策
  refundSupport?: "yes" | "partial" | "no" | "unknown"; // 是否支持退款
  refundCondition?: string; // 退款条件描述
  compensationPolicy?: string; // 故障补偿政策

  // 服务保障
  supportChannels?: string[]; // 客服渠道
  serviceHours?: string; // 服务时间
  sla?: string; // 服务等级协议

  // 使用限制
  concurrencyLimit?: number;
  rateLimit?: string;

  // 访问限制
  requiresLogin?: boolean; // 是否需要登录才能查看价格

  // 其他
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
