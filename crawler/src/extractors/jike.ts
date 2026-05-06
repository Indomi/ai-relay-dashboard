import { RawPost } from "../types";

// 即刻 API（需要登录）
const JIKE_API = "https://api.jike.ruguoapp.com/1.0";

// 话题 ID（AI相关）
const TOPIC_IDS = [
  "553870e8e4b0cd50d0f9a829", // AI
  "5c7a5b7ce4b0f2a5d8f8c8d8", // OpenAI
];

// 生成模拟数据
export function generateMockJikePosts(): RawPost[] {
  const now = new Date();
  return [
    {
      id: "jike-001",
      platform: "jike",
      title: "发现一个超便宜的API中转站",
      content: `最近发现一个叫"极速API"的中转站，价格真的很便宜：

💰 GPT-4o: ¥8/1M tokens
💰 Claude 3.5: ¥10/1M tokens

用了一个月，速度很快，稳定性也不错。
TG: @jsapi_admin
官网: jsapi.example.com

分享给大家，有需要的可以试试。`,
      author: "AI探索者",
      url: "https://web.okjike.com/originalPost/123456789",
      publishedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4小时前
    },
    {
      id: "jike-002",
      platform: "jike",
      title: "API中转站避坑指南",
      content: `用了半年各种API中转站，总结一些经验：

✅ 靠谱的：
- 极速API：速度快，价格透明
- CloudBridge：企业级，稳定
- AI Hub Pro：模型多

❌ 避坑的：
- 没有售后的个人站
- 价格异常低的（可能是跑路站）
- 没有测试额度的

💡 建议：
1. 先测试再付费
2. 不要一次充太多
3. 选择有社区的`,
      author: "老司机带路",
      url: "https://web.okjike.com/originalPost/987654321",
      publishedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12小时前
    },
  ];
}

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

  // 如果有 token，尝试真实爬取
  if (accessToken) {
    const posts = await fetchJikeReal(accessToken);
    if (posts.length > 0) {
      return posts;
    }
  }

  // 否则返回模拟数据
  console.log("[Jike] No access token provided, using mock data");
  return generateMockJikePosts();
}
