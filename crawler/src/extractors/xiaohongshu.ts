import { RawPost } from "../types";

// 小红书搜索 API（需要签名和 Cookie）
const XHS_SEARCH_API = "https://edith.xiaohongshu.com/api/sns/web/v1/search/notes";

// 搜索关键词
const KEYWORDS = [
  "API中转",
  "OpenAI代理",
  "GPT充值",
  "Claude中转",
  "AI API",
  "API站",
  "真心求推",
];

// 生成模拟数据
export function generateMockXiaohongshuPosts(): RawPost[] {
  const now = new Date();
  return [
    {
      
      platform: "xiaohongshu",
      title: "真心求推API中转站！之前的api站跑路了😭",
      content: `姐妹们，我之前用的API中转站突然跑路了，还剩好几百余额没退...

有没有靠谱的中转站推荐？主要用 GPT-4o 和 Claude 3.5。

要求：
1. 稳定，不要跑路
2. 价格合理
3. 有售后

【评论区推荐】
@AI小达人: 推荐极速API，用了半年很稳定，TG @jsapi_admin
@技术宅: CloudBridge 不错，企业级服务，微信 cloudbridge_kefu
@省钱达人: 小白的AI铺子最便宜，GPT-4o 只要 ¥5/1M，TG @xiaobai_ai
@程序员小哥: AI Hub Pro 模型最全，支持50+模型，官网 aihubpro.example.com

感谢推荐！`,
      author: "求推荐的小白",
      url: "https://www.xiaohongshu.com/explore/123456789",
      publishedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前
      fetchedAt: new Date().toISOString(),
    },
    {
      
      platform: "xiaohongshu",
      title: "程序员必备的AI API平台推荐🚀",
      content: `作为程序员，分享几个我常用的API中转站：

1️⃣ 极速API
- 价格：GPT-4o ¥8/1M，Claude ¥12/1M
- 优点：速度快，稳定
- 联系：TG @jsapi_admin
- 官网：jsapi.example.com

2️⃣ CloudBridge AI
- 价格：订阅制 ¥99/月起
- 优点：企业级，SLA保障
- 联系：微信 cloudbridge_kefu

3️⃣ AI Hub Pro
- 价格：¥12/1M 起
- 优点：模型最全，50+模型
- 官网：aihubpro.example.com

4️⃣ OpenKey
- 价格：GPT-4o ¥6/1M
- 优点：新站优惠多
- 官网：openkey.example.com

【评论区】
@新手程序员: 感谢分享！极速API确实好用
@省钱党: 小白的AI铺子更便宜，GPT-4o ¥5/1M
@官方号: 极速API新用户送 $10，欢迎体验`,
      author: "技术博主",
      url: "https://www.xiaohongshu.com/explore/987654321",
      publishedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // 3小时前
      fetchedAt: new Date().toISOString(),
    },
    {
      
      platform: "xiaohongshu",
      title: "避坑！这些API中转站不要用❌",
      content: `分享一下我踩过的坑，大家避雷：

❌ 跑路站：
- 没有售后的个人站
- 价格异常低的（低于成本价）
- 没有测试额度的

✅ 推荐的靠谱站：
- 极速API：稳定，有售后
- CloudBridge：企业级
- AI Hub Pro：模型全

【评论区】
@受害者: 我之前被坑了500块，大家一定要选有售后的
@老司机: 极速API用了半年，很稳
@新人: 求推荐支持 o1 的站
@官方: AI Hub Pro 支持 o1，联系 support@aihubpro.example.com`,
      author: "避坑指南",
      url: "https://www.xiaohongshu.com/explore/111222333",
      publishedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6小时前
      fetchedAt: new Date().toISOString(),
    },
  ];
}

// 真实爬取函数（需要 Cookie 和签名）
export async function crawlXiaohongshu(cookie?: string): Promise<RawPost[]> {
  // 小红书需要：
  // 1. 登录 Cookie
  // 2. 请求签名（x-s, x-t）
  // 3. 设备指纹（x-s-common）

  console.log("[Xiaohongshu] Crawler initialized (using mock data for demo)");
  return generateMockXiaohongshuPosts();
}

// 真实实现示例（需要签名库）
/*
async function fetchXhsReal(keyword: string, cookie: string): Promise<RawPost[]> {
  const response = await fetch(XHS_SEARCH_API, {
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'Content-Type': 'application/json',
      'x-s': generateSignature(),  // 需要签名算法
      'x-t': Date.now().toString(),
      'x-s-common': generateFingerprint(),  // 设备指纹
    },
    body: JSON.stringify({
      keyword,
      page: 1,
      page_size: 20,
    }),
  });
  
  // 解析数据...
}
*/
