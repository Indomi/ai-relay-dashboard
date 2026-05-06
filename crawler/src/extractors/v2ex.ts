import { CheerioCrawler, Request } from "crawlee";
import { RawPost } from "../types";

const BASE_URL = "https://www.v2ex.com";
const SEARCH_URL = `${BASE_URL}/search`;

// V2EX 关键词搜索
const KEYWORDS = [
  "API中转",
  "OpenAI代理",
  "GPT充值",
  "Claude中转",
  "AI API",
];

export async function crawlV2EX(): Promise<RawPost[]> {
  const posts: RawPost[] = [];
  const seenUrls = new Set<string>();

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: 50,
    maxConcurrency: 2,
    requestHandlerTimeoutSecs: 30,

    async requestHandler({ request, $, log }) {
      const url = request.url;
      log.info(`[V2EX] Processing: ${url}`);

      // 搜索结果页
      if (url.includes("/search")) {
        // 提取帖子链接
        $("div.cell.item").each((_, el) => {
          const link = $(el).find("span.item_title a");
          const href = link.attr("href");
          const title = link.text().trim();

          if (href && title) {
            const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
            if (!seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              // 将帖子详情页加入队列
              // crawler.addRequests([fullUrl]); // 实际使用时启用
            }
          }
        });
        return;
      }

      // 帖子详情页
      const title = $("h1").first().text().trim();
      const content = $("div.topic_content").first().text().trim();
      const author = $("a.dark").first().text().trim();
      const timeText = $("small.gray").first().text().trim();

      if (title && content) {
        posts.push({
          url,
          platform: "v2ex",
          title,
          content,
          author: author || "unknown",
          publishedAt: parseV2EXTime(timeText),
          fetchedAt: new Date().toISOString(),
        });
      }
    },

    failedRequestHandler({ request, log }) {
      log.error(`[V2EX] Failed: ${request.url}`);
    },
  });

  // 启动搜索（实际使用时启用）
  // const startUrls = KEYWORDS.map(k => `${SEARCH_URL}?q=${encodeURIComponent(k)}`);
  // await crawler.run(startUrls);

  // 模拟数据用于测试
  console.log("[V2EX] Crawler initialized (using mock data for demo)");

  return posts;
}

function parseV2EXTime(timeText: string): string {
  // V2EX 时间格式: "1 小时 23 分钟前" 或 "2025-05-06 12:34:56"
  const now = new Date();

  if (timeText.includes("前")) {
    const hourMatch = timeText.match(/(\d+)\s*小时/);
    const minMatch = timeText.match(/(\d+)\s*分钟/);
    const dayMatch = timeText.match(/(\d+)\s*天/);

    if (dayMatch) {
      now.setDate(now.getDate() - parseInt(dayMatch[1]));
    }
    if (hourMatch) {
      now.setHours(now.getHours() - parseInt(hourMatch[1]));
    }
    if (minMatch) {
      now.setMinutes(now.getMinutes() - parseInt(minMatch[1]));
    }
  } else if (timeText.match(/\d{4}-\d{2}-\d{2}/)) {
    return new Date(timeText).toISOString();
  }

  return now.toISOString();
}

// 模拟数据生成器（用于演示）
export function generateMockV2EXPosts(): RawPost[] {
  return [
    {
      url: "https://v2ex.com/t/123456",
      platform: "v2ex",
      title: "推荐一个稳定快速的API中转站 - 极速API",
      content: `用了半年多了，非常稳定。

支持模型：
- GPT-4o: ¥8/1M tokens
- GPT-4o-mini: ¥1.5/1M tokens
- Claude 3.5 Sonnet: ¥12/1M tokens
- Gemini 2.0 Flash: ¥3/1M tokens

计费方式：按量计费
新用户送 $5 免费额度
联系方式：TG @jsapi_admin
官网：https://jsapi.example.com

响应速度 300ms 左右，推荐！`,
      author: "techfan01",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
    {
      url: "https://v2ex.com/t/123457",
      platform: "v2ex",
      title: "CloudBridge AI 订阅制体验分享",
      content: `之前一直用按量计费，最近试了 CloudBridge 的订阅制，感觉不错。

套餐：
- 基础版 ¥49/月：GPT-4o 100万token + Claude 50万token
- 专业版 ¥149/月：GPT-4o 500万token + Claude 300万token + 所有模型
- 企业版 ¥499/月：无限token

支持的模型很全：
GPT-4o、GPT-4o-mini、Claude 3.5 Sonnet、Claude 3 Opus、Gemini 2.0 Flash、Gemini 2.5 Pro、DeepSeek V3

联系方式：微信 cloudbridge_kefu
官网：https://cloudbridge.example.com

适合用量大的朋友。`,
      author: "dev_master",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}
