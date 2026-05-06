import { RawPost } from "../types";

// 即刻 API（需要登录）
const JIKE_API = "https://api.jike.ruguoapp.com/1.0";

// 话题 ID（AI相关）
const TOPIC_IDS = [
  "553870e8e4b0cd50d0f9a829", // AI
  "5c7a5b7ce4b0f2a5d8f8c8d8", // OpenAI
];

// 真实爬取（需要登录 Token）
async function fetchJikeReal(accessToken: string): Promise<RawPost[]> {
  try {
    const response = await fetch(`${JIKE_API}/topics/${TOPIC_IDS[0]}/posts?limit=20`, {
      headers: {
        "x-jike-access-token": accessToken,
        "User-Agent": "Jike/8.0.0",
      },
    });

    if (!response.ok) {
      console.error("[Jike] API error:", response.status);
      return [];
    }

    const data = await response.json();
    // 解析数据...
    return [];
  } catch (error) {
    console.error("[Jike] Fetch error:", error);
    return [];
  }
}

// 主爬虫函数
export async function crawlJike(accessToken?: string): Promise<RawPost[]> {
  console.log("[Jike] Starting crawler...");

  if (!accessToken) {
    console.log("[Jike] No access token provided, skipping");
    return [];
  }

  try {
    const posts = await fetchJikeReal(accessToken);
    return posts;
  } catch (error) {
    console.error("[Jike] Crawl error:", error);
    return [];
  }
}
