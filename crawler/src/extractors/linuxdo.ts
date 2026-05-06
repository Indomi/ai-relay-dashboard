import { RawPost } from "../types";

const BASE_URL = "https://linux.do";
const KEYWORDS = ["AI API", "中转站", "模型服务", "OpenAI", "Claude", "API代理"];

// 真实爬取
export async function crawlLinuxDo(): Promise<RawPost[]> {
  console.log("[Linux.do] Starting real crawler...");
  const posts: RawPost[] = [];

  for (const keyword of KEYWORDS.slice(0, 3)) {
    try {
      const searchUrl = `${BASE_URL}/search.json?q=${encodeURIComponent(keyword)}&page=1`;
      console.log(`[Linux.do] Searching: ${keyword}`);

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        console.error(`[Linux.do] API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const topics = data?.topics || data?.posts || [];

      for (const topic of topics.slice(0, 5)) {
        try {
          const topicId = topic.id || topic.slug;
          const postUrl = `${BASE_URL}/t/${topicId}`;
          const post = await fetchPostDetail(postUrl);
          if (post) {
            posts.push(post);
          }
          await new Promise((r) => setTimeout(r, 2000));
        } catch (error) {
          console.error(`[Linux.do] Error fetching post:`, error);
        }
      }

      await new Promise((r) => setTimeout(r, 3000));
    } catch (error) {
      console.error(`[Linux.do] Error searching "${keyword}":`, error);
    }
  }

  console.log(`[Linux.do] Total posts fetched: ${posts.length}`);
  return posts;
}

async function fetchPostDetail(url: string): Promise<RawPost | null> {
  try {
    console.log(`[Linux.do] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Discourse 论坛的标题和内容提取
    const title = extractText(html, '<title>', '</title>');
    const content = extractText(html, '<div class="cooked"', '</div>');
    const author = extractText(html, '<a class="username', '</a>');

    if (title && content) {
      return {
        url,
        platform: "linux.do",
        title: title.replace(" - LINUX DO", "").trim(),
        content,
        author: author || "unknown",
        publishedAt: new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error(`[Linux.do] Error parsing ${url}:`, error);
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
