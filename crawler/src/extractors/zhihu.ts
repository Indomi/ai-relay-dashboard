import { RawPost } from "../types";

// 知乎搜索 API（需要登录）
const ZHIHU_SEARCH_API = "https://www.zhihu.com/api/v4/search_v3";

// 搜索关键词
const KEYWORDS = ["API中转", "OpenAI代理", "GPT充值", "Claude中转", "AI API"];

// 真实爬取（需要 Cookie）
async function fetchZhihuReal(keyword: string, cookie: string): Promise<RawPost[]> {
  try {
    const response = await fetch(`${ZHIHU_SEARCH_API}?t=general&q=${encodeURIComponent(keyword)}&correction=1&offset=0&limit=20`, {
      headers: {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error("[Zhihu] API error:", response.status);
      return [];
    }

    const data = await response.json();
    // 解析数据...
    return [];
  } catch (error) {
    console.error("[Zhihu] Fetch error:", error);
    return [];
  }
}

// 主爬虫函数
export async function crawlZhihu(cookie?: string): Promise<RawPost[]> {
  console.log("[Zhihu] Starting crawler...");

  if (!cookie) {
    console.log("[Zhihu] No cookie provided, skipping");
    return [];
  }

  try {
    const allPosts: RawPost[] = [];
    for (const keyword of KEYWORDS) {
      const posts = await fetchZhihuReal(keyword, cookie);
      allPosts.push(...posts);
    }
    return allPosts;
  } catch (error) {
    console.error("[Zhihu] Crawl error:", error);
    return [];
  }
}
