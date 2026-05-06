import { RawPost } from "../types";

const BASE_URL = "https://www.v2ex.com";
const API_URL = BASE_URL + "/api";

const CORE_KEYWORDS = [
  "中转", "api key", "openai", "claude", "gpt-4", "gpt-3",
  "token", "proxy", "relay", "one-api", "new-api",
];

export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("V2EX Starting real crawler...");
  const posts: RawPost[] = [];
  const seenIds = new Set<number>();
  const maxPages = 5;

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = API_URL + "/topics/latest.json?p=" + page;
      console.log("V2EX Fetching page " + page);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.error("V2EX API error: " + response.status);
        break;
      }

      const topics = (await response.json()) as V2exTopic[];
      if (!topics || topics.length === 0) break;

      let pageRelevant = 0;

      for (const topic of topics) {
        if (seenIds.has(topic.id)) continue;
        seenIds.add(topic.id);

        const text = (topic.title + " " + (topic.content_rendered || topic.content || "")).toLowerCase();
        const coreMatch = CORE_KEYWORDS.some(function(kw) { return text.indexOf(kw.toLowerCase()) !== -1; });

        if (!coreMatch) continue;

        console.log("V2EX Relevant: " + topic.title);

        const detail = await fetchTopicDetail(topic.id);
        if (detail) {
          posts.push(detail);
          pageRelevant++;
        }

        if (pageRelevant >= 5) break;
      }

      await new Promise(function(r) { setTimeout(r, 2000); });
      if (posts.length >= 10) break;
    } catch (error) {
      console.error("V2EX Error page " + page + ": " + error);
      break;
    }
  }

  console.log("V2EX Total posts: " + posts.length);
  return posts;
}

interface V2exTopic {
  id: number;
  title: string;
  content: string;
  content_rendered: string;
  created: number;
  member: { username: string };
  node: { name: string };
  replies: number;
}

interface V2exReply {
  id: number;
  content: string;
  content_rendered: string;
  member: { username: string };
  created: number;
}

async function fetchTopicDetail(topicId: number): Promise<RawPost | null> {
  try {
    console.log("V2EX Fetching topic " + topicId);

    const topicResponse = await fetch(API_URL + "/topics/show.json?id=" + topicId, {
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

    let comments = "";
    try {
      const repliesResponse = await fetch(API_URL + "/replies/show.json?topic_id=" + topicId, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (repliesResponse.ok) {
        const replies = (await repliesResponse.json()) as V2exReply[];
        comments = replies.slice(0, 20).map(function(r) {
          return "@" + r.member.username + ": " + stripHtml(r.content_rendered || r.content);
        }).join("\n");
      }
    } catch (e) {
      // ignore
    }

    const content = stripHtml(topic.content_rendered || topic.content || "");

    return {
      url: BASE_URL + "/t/" + topicId,
      platform: "v2ex",
      title: topic.title,
      content: content + (comments ? "\n\n" + comments : ""),
      author: topic.member ? topic.member.username : "unknown",
      publishedAt: new Date(topic.created * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("V2EX Error topic " + topicId + ": " + error);
    return null;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
