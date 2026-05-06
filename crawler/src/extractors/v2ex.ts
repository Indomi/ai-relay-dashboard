import { RawPost } from "../types";

const BASE_URL = "https://www.v2ex.com";
const API_URL = `${BASE_URL}/api";

// 内容预过滤关键词
const RELEVANT_KEYWORDS = [
  "中转站", "API中转", "OpenAI 中转", "GPT 中转", "Claude 中转",
  "API 代理", "AI API", "api relay", "openai proxy",
  "token 充值", "key 充值", "额度",
  "new-api", "one-api", "chat-api",
];

// 必须包含的核心关键词（至少匹配一个）
const CORE_KEYWORDS = [
  "中转", "api key", "openai", "claude", "gpt-4", "gpt-3",
  "token", "proxy", "relay", "one-api", "new-api",
];

// 真实爬取 - 遍历 V2EX 最新帖子
export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("[V2EX] Starting real crawler...");
  const posts: RawPost[] = [];
  const seenIds = new Set<number>();

  // 获取最新帖子（V2EX API 返回最近的帖子）
  const maxPages = 5; // 最多遍历 5 页

  for (let page = 1; page <= maxPages; page++) {
    try {
      console.log(`[V2EX] Fetching latest topics, page ${page}`);

      const response = await fetch(`${API_URL}/topics/latest.json?p=${page}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[V2EX] API error: ${response.status}`);
        break;
      }

      const topics = (await response.json()) as V2exTopic[];
      if (!topics || topics.length === 0) break;

      let relevantCount = 0;

      for (const topic of topics) {
        if (seenIds.has(topic.id)) continue;
        seenIds.add(topic.id);

        // 快速预过滤：标题或内容必须包含核心关键词
        const text = `${topic.title} ${topic.content_rendered || topic.content || ""}`.toLowerCase();
        const coreMatch = CORE_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));

        if (!coreMatch) continue;

        // 详细过滤：必须包含至少2个相关关键词
        const relevantCount2 = RELEVANT_KEYWORDS.filter((kw) => text.includes(kw.toLowerCase())).length;
        if (relevantCount2 < 1) continue;

        console.log(`[V2EX] Relevant topic: ${topic.title} (${relevantCount2} keywords)`);

        // 获取帖子详情（含评论）
        const detail = await fetchTopicDetail(topic.id);
        if (detail) {
          posts.push(detail);
          relevantCount++;
        }

        // 控制请求数量
        if (relevantCount >= 5) break;
      }

      await new Promise((r) => setTimeout(r, 2000));

      // 如果已经找到足够的帖子，停止遍历
      if (posts.length >= 10) break;
    } catch (error) {
      console.error(`[V2EX] Error fetching page ${page}:`, error);
      break;
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
  node: {
    name: string;
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

async function fetchTopicDetail(topicId: number): Promise<RawPost | null> {
  try {
    console.log(`[V2EX] Fetching topic detail: ${topicId}`);

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
    if (!topic.title) return null;

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

    const content = stripHtml(topic.content_rendered || topic.content || "");

    return {
      url: `${BASE_URL}/t/${topicId}`,
      platform: "v2ex",
      title: topic.title,
      content: content + (comments ? `\n\n【评论】\n${comments}` : ""),
      author: topic.member?.username || "unknown",
      publishedAt: new Date(topic.created * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[V2EX] Error fetching topic ${topicId}:`, error);
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
