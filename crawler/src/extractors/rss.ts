import { RawPost } from "../types";
import * as cheerio from "cheerio";

// RSS 源配置
const RSS_SOURCES = [
  {
    name: "酷壳 - 陈皓",
    url: "https://coolshell.cn/feed",
    keywords: ["AI", "API", "OpenAI", "GPT"],
  },
  {
    name: "阮一峰的网络日志",
    url: "https://www.ruanyifeng.com/blog/atom.xml",
    keywords: ["AI", "API", "OpenAI", "GPT", "Claude"],
  },
  {
    name: "V2EX RSS",
    url: "https://www.v2ex.com/index.xml",
    keywords: ["API中转", "OpenAI", "GPT", "Claude", "API代理"],
  },
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author?: string;
}

// 解析 RSS XML
function parseRSS(xml: string): RSSItem[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items: RSSItem[] = [];

  $("item").each((_, element) => {
    const $item = $(element);
    items.push({
      title: $item.find("title").text() || "",
      link: $item.find("link").text() || "",
      description: $item.find("description").text() || "",
      pubDate: $item.find("pubDate").text() || new Date().toISOString(),
      author: $item.find("author").text() || $item.find("dc\\:creator").text() || "未知",
    });
  });

  return items;
}

// 过滤相关文章
function filterByKeywords(items: RSSItem[], keywords: string[]): RSSItem[] {
  return items.filter((item) => {
    const text = `${item.title} ${item.description}`.toLowerCase();
    return keywords.some((k) => text.includes(k.toLowerCase()));
  });
}

// 获取单个 RSS 源
async function fetchRSS(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Relay-Bot/1.0)",
      },
    });
    if (!response.ok) {
      console.error(`[RSS] Failed to fetch ${url}: ${response.status}`);
      return "";
    }
    return await response.text();
  } catch (error) {
    console.error(`[RSS] Error fetching ${url}:`, error);
    return "";
  }
}

// 主爬虫函数
export async function crawlRSS(): Promise<RawPost[]> {
  console.log("[RSS] Starting crawler...");
  const posts: RawPost[] = [];

  try {
    for (const source of RSS_SOURCES) {
      console.log(`[RSS] Fetching ${source.name}...`);
      const xml = await fetchRSS(source.url);

      if (xml) {
        const items = parseRSS(xml);
        const relevant = filterByKeywords(items, source.keywords);

        for (const item of relevant) {
          posts.push({
            url: item.link,
            platform: "rss",
            title: item.title,
            content: item.description,
            author: item.author || "未知",
            publishedAt: item.pubDate,
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      // 避免请求过快
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`[RSS] Found ${posts.length} relevant posts`);
  } catch (error) {
    console.error("[RSS] Crawl error:", error);
  }

  return posts;
}
