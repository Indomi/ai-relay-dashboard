import { RawPost } from "../types";

// 小红书搜索 API（需要签名和 Cookie）
const XHS_SEARCH_API = "https://edith.xiaohongshu.com/api/sns/web/v1/search/notes";

// 搜索关键词
const KEYWORDS = [
  "API中转",
  "OpenAI代理",
  "GPT充值",
  "Claude中转",
  "AI API",
  "API站",
  "真心求推",
];

// 主爬虫函数
export async function crawlXiaohongshu(cookie?: string): Promise<RawPost[]> {
  console.log("[Xiaohongshu] Starting crawler...");

  if (!cookie) {
    console.log("[Xiaohongshu] No cookie provided, skipping");
    return [];
  }

  try {
    // 小红书需要：
    // 1. 登录 Cookie
    // 2. 请求签名（x-s, x-t）
    // 3. 设备指纹（x-s-common）
    // TODO: 实现签名算法后完成真实爬取
    console.log("[Xiaohongshu] Real crawl not yet implemented (signature required)");
    return [];
  } catch (error) {
    console.error("[Xiaohongshu] Crawl error:", error);
    return [];
  }
}
