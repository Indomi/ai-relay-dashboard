import { RawPost } from "../types";

// V2EX 搜索 URL
const BASE_URL = "https://www.v2ex.com";
const SEARCH_URL = `${BASE_URL}/search`;

// 搜索关键词
const KEYWORDS = [
  "API中转",
  "OpenAI代理",
  "GPT充值",
  "Claude中转",
  "AI API",
];

// 真实爬取函数
export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("[V2EX] Starting real crawler...");
  const posts: RawPost[] = [];

  for (const keyword of KEYWORDS) {
    try {
      // 1. 搜索帖子
      const searchUrl = `${SEARCH_URL}?q=${encodeURIComponent(keyword)}`;
      console.log(`[V2EX] Searching: ${keyword}`);

      const searchResponse = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
        },
      });

      if (!searchResponse.ok) {
        console.error(`[V2EX] Search failed: ${searchResponse.status}`);
        continue;
      }

      const searchHtml = await searchResponse.text();

      // 2. 解析搜索结果，提取帖子链接
      const postUrls = extractPostUrls(searchHtml);
      console.log(`[V2EX] Found ${postUrls.length} posts for "${keyword}"`);

      // 3. 访问每个帖子获取详细内容
      for (const url of postUrls.slice(0, 5)) { // 限制每个关键词最多5个帖子
        try {
          const post = await fetchPostDetail(url);
          if (post) {
            posts.push(post);
          }
          // 避免请求过快
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          console.error(`[V2EX] Error fetching ${url}:`, error);
        }
      }

      // 关键词间隔
      await new Promise((r) => setTimeout(r, 3000));
    } catch (error) {
      console.error(`[V2EX] Error searching "${keyword}":`, error);
    }
  }

  console.log(`[V2EX] Total posts fetched: ${posts.length}`);
  return posts;
}

// 从搜索页面提取帖子 URL
function extractPostUrls(html: string): string[] {
  const urls: string[] = [];
  // 匹配帖子链接: /t/123456 或 https://www.v2ex.com/t/123456
  const regex = /href="\/t\/(\d+)(?:[^"]*)?"/g;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const url = `${BASE_URL}/t/${match[1]}`;
    if (!urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

// 获取帖子详情
async function fetchPostDetail(url: string): Promise<RawPost | null> {
  try {
    console.log(`[V2EX] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // 解析帖子内容
    const title = extractText(html, '<h1[^>]*>', '</h1>');
    const content = extractText(html, '<div class="topic_content"[^>]*>', '</div>');
    const author = extractText(html, '<a class="dark" href="/member/', '</a>');
    const timeText = extractText(html, '<small class="gray">', '</small>');

    // 提取评论
    const comments = extractComments(html);

    if (title && content) {
      return {
        url,
        platform: "v2ex",
        title,
        content: content + "\n\n【评论】\n" + comments,
        author: author || "unknown",
        publishedAt: parseV2EXTime(timeText),
        fetchedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[V2EX] Error parsing ${url}:`, error);
    return null;
  }
}

// 简单的 HTML 文本提取
function extractText(html: string, startPattern: string, endPattern: string): string {
  const startIndex = html.indexOf(startPattern);
  if (startIndex === -1) return "";

  const contentStart = html.indexOf(">", startIndex) + 1;
  const endIndex = html.indexOf(endPattern, contentStart);

  if (endIndex === -1) return "";

  const raw = html.substring(contentStart, endIndex);
  // 移除 HTML 标签
  return raw.replace(/<[^>]*>/g, "").trim();
}

// 提取评论
function extractComments(html: string): string {
  const comments: string[] = [];
  // 简单匹配评论内容
  const commentRegex = /<div class="reply_content"[^>]*>([\s\S]*?)<\/div>/g;
  let match;

  while ((match = commentRegex.exec(html)) !== null) {
    const comment = match[1].replace(/<[^>]*>/g, "").trim();
    if (comment) {
      comments.push(comment);
    }
  }

  return comments.slice(0, 10).join("\n"); // 最多10条评论
}

// 解析 V2EX 时间格式
function parseV2EXTime(timeText: string): string {
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

// 模拟数据（作为备用）
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

联系方式：TG @jsapi_admin
官网：https://jsapi.example.com`,
      author: "techfan01",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}
