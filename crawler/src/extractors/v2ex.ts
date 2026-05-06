import { RawPost } from "../types";

const BASE_URL = "https://www.v2ex.com";
const API_URL = `${BASE_URL}/api`;
const KEYWORDS = [
  "API中转站",
  "OpenAI 中转",
  "GPT 中转",
  "Claude 中转",
  "AI API 中转",
  "API 代理",
  "中转站 推荐",
];

// 内容预过滤 - 帖子必须包含这些关键词才处理
const CONTENT_FILTER = [
  "中转", "代理", "API key", "token", "充值",
  "openai", "claude", "gpt", "模型",
  "按量计费", "订阅", "官网",
];

// 真实爬取 - 使用 V2EX API
export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("[V2EX] Starting real crawler...");
  const posts: RawPost[] = [];

  // 方式1: 使用 V2EX 最新主题 API，按节点筛选
  const relevantNodes = ["share", "create", "programmer", "macos", "apple", "android", "windows"];

  for (const node of relevantNodes) {
    try {
      const url = `${API_URL}/topics/hot/${node}.json`;
      console.log(`[V2EX] Fetching node: ${node}`);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[V2EX] Node API error: ${response.status}`);
        continue;
      }

      const topics = (await response.json()) as V2exTopic[];

      for (const topic of topics) {
        const text = `${topic.title} ${topic.content || ""}`.toLowerCase();
        const isRelevant = KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));

        if (isRelevant && topic.content) {
          // 获取帖子详情（含评论）
          const detail = await fetchTopicDetail(topic.id);
          posts.push(detail || {
            url: `${BASE_URL}/t/${topic.id}`,
            platform: "v2ex",
            title: topic.title,
            content: topic.content || "",
            author: topic.member?.username || "unknown",
            publishedAt: new Date(topic.created * 1000).toISOString(),
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`[V2EX] Error fetching node ${node}:`, error);
    }
  }

  // 方式2: 搜索 API
  for (const keyword of KEYWORDS.slice(0, 2)) {
    try {
      const searchUrl = `${BASE_URL}/search?q=${encodeURIComponent(keyword)}&type=topic`;
      console.log(`[V2EX] Searching: ${keyword}`);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const topicIds = extractTopicIds(html);
      console.log(`[V2EX] Found ${topicIds.length} topic IDs for "${keyword}"`);

      // 去重
      const existingIds = new Set(posts.map((p) => p.url));
      for (const topicId of topicIds) {
        const url = `${BASE_URL}/t/${topicId}`;
        if (existingIds.has(url)) continue;

        const detail = await fetchTopicDetail(topicId);
        if (detail) {
          // 内容预过滤：必须包含至少2个相关关键词
          const text = `${detail.title} ${detail.content}`.toLowerCase();
          const matchCount = CONTENT_FILTER.filter((kw) => text.includes(kw.toLowerCase())).length;
          if (matchCount >= 2) {
            posts.push(detail);
            existingIds.add(url);
            console.log(`[V2EX] Relevant post: ${detail.title.substring(0, 50)} (${matchCount} keywords)`);
          } else {
            console.log(`[V2EX] Skipping irrelevant post: ${detail.title.substring(0, 50)} (${matchCount} keywords)`);
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (error) {
      console.error(`[V2EX] Error searching "${keyword}":`, error);
    }
  }

  console.log(`[V2EX] Total posts fetched: ${posts.length}`);
  return posts;
}

interface V2exTopic {
  id: number;
  title: string;
  content: string;
  content_rendered: string;
  created: number;
  member: {
    username: string;
  };
  replies: number;
}

interface V2exReply {
  id: number;
  content: string;
  content_rendered: string;
  member: {
    username: string;
  };
  created: number;
}

// 通过 API 获取帖子详情（含评论）
async function fetchTopicDetail(topicId: number): Promise<RawPost | null> {
  try {
    console.log(`[V2EX] Fetching topic detail: ${topicId}`);

    // 获取帖子详情
    const topicResponse = await fetch(`${API_URL}/topics/show.json?id=${topicId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (!topicResponse.ok) return null;

    const topicData = (await topicResponse.json()) as V2exTopic[];
    if (!topicData || topicData.length === 0) return null;

    const topic = topicData[0];
    if (!topic.title || !topic.content) return null;

    // 获取评论
    let comments = "";
    try {
      const repliesResponse = await fetch(
        `${API_URL}/replies/show.json?topic_id=${topicId}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
          },
        }
      );

      if (repliesResponse.ok) {
        const replies = (await repliesResponse.json()) as V2exReply[];
        comments = replies
          .slice(0, 20)
          .map((r) => `@${r.member.username}: ${stripHtml(r.content_rendered || r.content)}`)
          .join("\n");
      }
    } catch {
      // 评论获取失败不影响主流程
    }

    return {
      url: `${BASE_URL}/t/${topicId}`,
      platform: "v2ex",
      title: topic.title,
      content: topic.content + (comments ? `\n\n【评论】\n${comments}` : ""),
      author: topic.member?.username || "unknown",
      publishedAt: new Date(topic.created * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[V2EX] Error fetching topic ${topicId}:`, error);
    return null;
  }
}

// 从搜索页面提取帖子 ID
function extractTopicIds(html: string): number[] {
  const ids: number[] = [];
  const regex = /href="\/t\/(\d+)(?:[^"]*)?"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const id = parseInt(match[1]);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

// 移除 HTML 标签
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
