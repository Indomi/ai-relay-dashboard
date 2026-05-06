import { RawPost } from "../types";

const BASE_URL = "https://www.v2ex.com";
const SEARCH_URL = `${BASE_URL}/search`;
const KEYWORDS = ["API中转", "OpenAI代理", "GPT充值", "Claude中转", "AI API"];

// 真实爬取
export async function crawlV2EX(): Promise<RawPost[]> {
  console.log("[V2EX] Starting real crawler...");
  const posts: RawPost[] = [];

  for (const keyword of KEYWORDS) {
    try {
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
      const postUrls = extractPostUrls(searchHtml);
      console.log(`[V2EX] Found ${postUrls.length} posts for "${keyword}"`);

      for (const url of postUrls.slice(0, 5)) {
        try {
          const post = await fetchPostDetail(url);
          if (post) {
            posts.push(post);
          }
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          console.error(`[V2EX] Error fetching ${url}:`, error);
        }
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (error) {
      console.error(`[V2EX] Error searching "${keyword}":`, error);
    }
  }

  console.log(`[V2EX] Total posts fetched: ${posts.length}`);
  return posts;
}

function extractPostUrls(html: string): string[] {
  const urls: string[] = [];
  const regex = /href="\/t\/(\d+)(?:[^"]*)?"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = `${BASE_URL}/t/${match[1]}`;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

async function fetchPostDetail(url: string): Promise<RawPost | null> {
  try {
    console.log(`[V2EX] Fetching: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const title = extractText(html, '<h1[^>]*>', '</h1>');
    const content = extractText(html, '<div class="topic_content"[^>]*>', '</div>');
    const author = extractText(html, '<a class="dark" href="/member/', '</a>');

    // 提取评论
    const comments = extractComments(html);

    if (title && content) {
      return {
        url,
        platform: "v2ex",
        title,
        content: content + "\n\n【评论】\n" + comments,
        author: author || "unknown",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    console.error(`[V2EX] Error parsing ${url}:`, error);
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

function extractComments(html: string): string {
  const comments: string[] = [];
  const commentRegex = /<div class="reply_content"[^>]*>([\s\S]*?)<\/div>/g;
  let match;
  while ((match = commentRegex.exec(html)) !== null) {
    const comment = match[1].replace(/<[^>]*>/g, "").trim();
    if (comment) comments.push(comment);
  }
  return comments.slice(0, 10).join("\n");
}
