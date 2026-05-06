import { RawPost } from "../types";

var BASE_URL = "https://www.v2ex.com";
var API_URL = BASE_URL + "/api";
var SOV2EX_URL = "https://www.sov2ex.com/api/search";

var SEARCH_KEYWORDS = [
  "API中转", "OpenAI 中转", "GPT 中转", "Claude 中转",
  "API 代理", "中转站", "AI API", "one-api", "new-api",
];

var CORE_KEYWORDS = [
  "中转", "api key", "openai", "claude", "gpt", "token",
  "proxy", "relay", "one-api", "new-api", "充值", "额度",
];

var RELEVANT_NODES = [
  "qna", "share", "create", "programmer", "apple",
  "windows", "macos", "android", "jobs", "deal",
];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
};

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

interface Sov2exHit {
  _source: {
    id: number;
    title: string;
    content: string;
    member: string;
    created: string;
  };
}

interface Sov2exResponse {
  hits: Sov2exHit[];
}

export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("V2EX Starting full search crawler...");

  var posts: RawPost[] = [];
  var seenIds = new Set<number>();

  // Approach 1: sov2ex.com search API (primary)
  try {
    console.log("V2EX [Approach 1] Searching via sov2ex.com...");
    var approach1Posts = await searchViaSov2ex(seenIds);
    posts = posts.concat(approach1Posts);
    console.log("V2EX [Approach 1] Found " + approach1Posts.length + " posts");
  } catch (error) {
    console.error("V2EX [Approach 1] Failed: " + error);
  }

  // Approach 2: node-based traversal (fallback / supplement)
  try {
    console.log("V2EX [Approach 2] Traversing nodes...");
    var approach2Posts = await traverseNodes(seenIds);
    posts = posts.concat(approach2Posts);
    console.log("V2EX [Approach 2] Found " + approach2Posts.length + " posts");
  } catch (error) {
    console.error("V2EX [Approach 2] Failed: " + error);
  }

  console.log("V2EX Total unique posts: " + posts.length);
  return posts;
}

// ---------------------------------------------------------------------------
// Approach 1: sov2ex.com search API
// ---------------------------------------------------------------------------

async function searchViaSov2ex(seenIds: Set<number>): Promise<RawPost[]> {
  var posts: RawPost[] = [];

  for (var i = 0; i < SEARCH_KEYWORDS.length; i++) {
    var keyword = SEARCH_KEYWORDS[i];
    if (posts.length >= 50) break;

    try {
      var url = SOV2EX_URL
        + "?q=" + encodeURIComponent(keyword)
        + "&size=20"
        + "&sort=created"
        + "&order=0";

      console.log("V2EX [sov2ex] Searching: " + keyword);

      var response = await fetch(url, {
        headers: HEADERS,
      });

      if (!response.ok) {
        console.error("V2EX [sov2ex] HTTP error " + response.status + " for keyword: " + keyword);
        continue;
      }

      var data = (await response.json()) as Sov2exResponse;

      if (!data || !data.hits || data.hits.length === 0) {
        continue;
      }

      for (var j = 0; j < data.hits.length; j++) {
        if (posts.length >= 50) break;

        var hit = data.hits[j];
        var topicId = hit._source.id;

        if (seenIds.has(topicId)) continue;
        seenIds.add(topicId);

        // Pre-filter: check if the hit title/content contains a core keyword
        var hitText = (hit._source.title + " " + (hit._source.content || "")).toLowerCase();
        if (!containsCoreKeyword(hitText)) continue;

        console.log("V2EX [sov2ex] Relevant topic: " + hit._source.title);

        var post = await fetchTopicDetail(topicId);
        if (post) {
          posts.push(post);
        }

        // Rate limit between topic detail fetches
        await delay(1500);
      }

      // Rate limit between keyword searches
      await delay(2000);
    } catch (error) {
      console.error("V2EX [sov2ex] Error for keyword '" + keyword + "': " + error);
    }
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Approach 2: V2EX node-based traversal
// ---------------------------------------------------------------------------

async function traverseNodes(seenIds: Set<number>): Promise<RawPost[]> {
  var posts: RawPost[] = [];
  var maxPages = 2;

  for (var n = 0; n < RELEVANT_NODES.length; n++) {
    var nodeName = RELEVANT_NODES[n];
    if (posts.length >= 30) break;

    for (var page = 1; page <= maxPages; page++) {
      if (posts.length >= 30) break;

      try {
        var url = API_URL + "/topics/show.json?node_name=" + nodeName + "&page=" + page;
        console.log("V2EX [node] " + nodeName + " page " + page);

        var response = await fetch(url, {
          headers: HEADERS,
        });

        if (!response.ok) {
          console.error("V2EX [node] HTTP error " + response.status);
          break;
        }

        var topics = (await response.json()) as V2exTopic[];

        if (!topics || topics.length === 0) break;

        for (var t = 0; t < topics.length; t++) {
          if (posts.length >= 30) break;

          var topic = topics[t];

          if (seenIds.has(topic.id)) continue;
          seenIds.add(topic.id);

          // Pre-filter: check title + content for search keywords
          var text = (topic.title + " " + (topic.content_rendered || topic.content || "")).toLowerCase();
          var hasSearchKeyword = SEARCH_KEYWORDS.some(function(kw) {
            return text.indexOf(kw.toLowerCase()) !== -1;
          });

          if (!hasSearchKeyword) continue;

          // Also verify core keyword presence
          if (!containsCoreKeyword(text)) continue;

          console.log("V2EX [node] Relevant: " + topic.title);

          var post = await fetchTopicDetail(topic.id);
          if (post) {
            posts.push(post);
          }

          await delay(1500);
        }

        await delay(2000);
      } catch (error) {
        console.error("V2EX [node] Error " + nodeName + " page " + page + ": " + error);
        break;
      }
    }
  }

  return posts;
}

// ---------------------------------------------------------------------------
// Shared: fetch topic detail + replies from V2EX API
// ---------------------------------------------------------------------------

async function fetchTopicDetail(topicId: number): Promise<RawPost | null> {
  try {
    console.log("V2EX Fetching topic detail: " + topicId);

    var topicResponse = await fetch(API_URL + "/topics/show.json?id=" + topicId, {
      headers: HEADERS,
    });

    if (!topicResponse.ok) return null;

    var topicData = (await topicResponse.json()) as V2exTopic[];
    if (!topicData || topicData.length === 0) return null;

    var topic = topicData[0];
    if (!topic.title) return null;

    // Final core-keyword check on full topic content
    var fullText = (topic.title + " " + (topic.content_rendered || topic.content || "")).toLowerCase();
    if (!containsCoreKeyword(fullText)) return null;

    // Fetch replies
    var comments = "";
    try {
      var repliesResponse = await fetch(API_URL + "/replies/show.json?topic_id=" + topicId, {
        headers: HEADERS,
      });

      if (repliesResponse.ok) {
        var replies = (await repliesResponse.json()) as V2exReply[];
        if (replies && replies.length > 0) {
          comments = replies.slice(0, 20).map(function(r) {
            return "@" + r.member.username + ": " + stripHtml(r.content_rendered || r.content);
          }).join("\n");
        }
      }
    } catch (e) {
      // ignore reply fetch errors
    }

    var content = stripHtml(topic.content_rendered || topic.content || "");

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
    console.error("V2EX Error fetching topic " + topicId + ": " + error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function containsCoreKeyword(text: string): boolean {
  var lower = text.toLowerCase();
  return CORE_KEYWORDS.some(function(kw) {
    return lower.indexOf(kw.toLowerCase()) !== -1;
  });
}

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function delay(ms: number): Promise<void> {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}
