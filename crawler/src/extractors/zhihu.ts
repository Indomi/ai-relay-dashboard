import { RawPost } from "../types";

// 知乎搜索 API（需要登录）
const ZHIHU_SEARCH_API = "https://www.zhihu.com/api/v4/search_v3";

// 搜索关键词
const KEYWORDS = ["API中转", "OpenAI代理", "GPT充值", "Claude中转", "AI API"];

// 生成模拟数据
export function generateMockZhihuPosts(): RawPost[] {
  const now = new Date();
  return [
    {
      url: "https://www.zhihu.com/question/123456789/answer/987654321",
      platform: "zhihu",
      title: "国内有哪些靠谱的AI API中转站推荐？",
      content: `作为一个长期使用AI API的开发者，我来分享一下我的经验：

## 推荐的中转站

### 1. 极速API
- 价格：¥8/1M tokens（GPT-4o）
- 优点：速度快，稳定
- 联系：TG @jsapi_admin
- 官网：jsapi.example.com

### 2. CloudBridge AI
- 价格：订阅制 ¥99/月起
- 优点：企业级服务，SLA保障
- 联系：微信 cloudbridge_kefu

### 3. AI Hub Pro
- 价格：¥12/1M tokens 起
- 优点：模型最全，支持50+模型
- 官网：aihubpro.example.com

## 选购建议

1. **个人开发者**：选按量计费的，如极速API
2. **团队使用**：选订阅制，如CloudBridge
3. **模型需求多**：选AI Hub Pro

希望对大家有帮助！`,
      author: "AI开发者老王",
      publishedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
    {
      url: "https://zhuanlan.zhihu.com/p/123456789",
      platform: "zhihu",
      title: "OpenAI API 国内调用方案全解析",
      content: `本文详细介绍在国内调用 OpenAI API 的几种方案：

## 方案对比

| 方案 | 价格 | 稳定性 | 推荐度 |
|------|------|--------|--------|
| API中转站 | 低 | 中 | ⭐⭐⭐⭐ |
| Azure OpenAI | 高 | 高 | ⭐⭐⭐ |
| 自建代理 | 中 | 低 | ⭐⭐ |

## 中转站推荐

经过测试，以下中转站比较靠谱：
- 极速API：价格透明，响应快
- 小白的AI铺子：个人卖家，价格最低
- OpenKey：新站，有优惠

## 注意事项

1. 选择有售后的
2. 注意数据安全
3. 测试后再付费`,
      author: "技术博主",
      publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}

// 真实爬取（需要 Cookie）
async function fetchZhihuReal(keyword: string, cookie: string): Promise<RawPost[]> {
  try {
    const response = await fetch(`${ZHIHU_SEARCH_API}?t=general&q=${encodeURIComponent(keyword)}&correction=1&offset=0&limit=20`, {
      headers: {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error("[Zhihu] API error:", response.status);
      return [];
    }

    const data = await response.json();
    // 解析数据...
    return [];
  } catch (error) {
    console.error("[Zhihu] Fetch error:", error);
    return [];
  }
}

// 主爬虫函数
export async function crawlZhihu(cookie?: string): Promise<RawPost[]> {
  console.log("[Zhihu] Starting crawler...");

  // 如果有 cookie，尝试真实爬取
  if (cookie) {
    const allPosts: RawPost[] = [];
    for (const keyword of KEYWORDS) {
      const posts = await fetchZhihuReal(keyword, cookie);
      allPosts.push(...posts);
    }
    if (allPosts.length > 0) {
      return allPosts;
    }
  }

  // 否则返回模拟数据
  console.log("[Zhihu] No cookie provided, using mock data");
  return generateMockZhihuPosts();
}
