import { RawPost } from "../types";

const BASE_URL = "https://www.nodeseek.com";
const KEYWORDS = ["API", "中转", "key", "token", "OpenAI", "Claude", "GPT", "模型"];

// 真实爬取
export async function crawlNodeSeek(): Promise<RawPost[]> {
  console.log("[NodeSeek] Starting real crawler...");
  const posts: RawPost[] = [];

  for (const keyword of KEYWORDS.slice(0, 3)) {
    try {
      const searchUrl = `${BASE_URL}/api/posts?keyword=${encodeURIComponent(keyword)}&page=1&pageSize=10`;
      console.log(`[NodeSeek] Searching: ${keyword}`);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
          "Referer": BASE_URL,
        },
      });

      if (!response.ok) {
        console.error(`[NodeSeek] API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const items = data?.data?.list || data?.result?.list || [];

      for (const item of items.slice(0, 5)) {
        try {
          const postId = item.id || item._id;
          const postUrl = `${BASE_URL}/post-${postId}`;
          const post = await fetchPostDetail(postUrl, postId);
          if (post) {
            posts.push(post);
          }
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          console.error(`[NodeSeek] Error fetching post:`, error);
        }
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (error) {
      console.error(`[NodeSeek] Error searching "${keyword}":`, error);
    }
  }

  console.log(`[NodeSeek] Total posts fetched: ${posts.length}`);
  return posts;
}

async function fetchPostDetail(url: string, postId: string): Promise<RawPost | null> {
  try {
    console.log(`[NodeSeek] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    const title = extractText(html, '<h1', '</h1>');
    const content = extractText(html, '<div class="post-content', '</div>');
    const author = extractText(html, '<a class="username', '</a>');

    if (title && content) {
      return {
        url,
        platform: "nodeseek",
        title,
        content,
        author: author || "unknown",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[NodeSeek] Error parsing ${url}:`, error);
    return null;
  }
}

function extractText(html: string, startPattern: string, endPattern: string): string {
  const startIndex = html.indexOf(startPattern);
  if (startIndex === -1) return "";

  const contentStart = html.indexOf(">", startIndex) + 1;
  const endIndex = html.indexOf(endPattern, contentStart);

  if (endIndex === -1) return "";

  return html.substring(contentStart, endIndex).replace(/<[^>]*>/g, "").trim();
}
