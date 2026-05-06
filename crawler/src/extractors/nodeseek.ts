import { CheerioCrawler } from "crawlee";
import { RawPost } from "../types";

const BASE_URL = "https://www.nodeseek.com";

export async function crawlNodeSeek(): Promise<RawPost[]> {
  console.log("[NodeSeek] Crawler initialized (using mock data for demo)");
  return generateMockNodeSeekPosts();
}

export function generateMockNodeSeekPosts(): RawPost[] {
  return [
    {
      url: "https://www.nodeseek.com/post-78901",
      platform: "nodeseek",
      title: "用了半年的API中转，分享体验",
      content: `极速API用了半年了，来分享一下体验。

价格：
- GPT-4o: ¥8/1M
- Claude 3.5: ¥12/1M
- Gemini: ¥3/1M

稳定性：99%以上，很少遇到不可用的情况
响应速度：平均320ms

免费额度：$5
支付方式：支付宝、微信、USDT

总体推荐，适合个人和小团队使用。
TG: @jsapi_admin`,
      author: "api_user",
      publishedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
    {
      url: "https://www.nodeseek.com/post-78902",
      platform: "nodeseek",
      title: "个人搭建的API中转站，价格便宜",
      content: `自己搭了个小站，佛系运营。

模型：
- GPT-4o: ¥5/1M（应该是全网最低了）
- GPT-4o-mini: ¥0.8/1M
- Claude 3.5: ¥8/1M

限制：
- 并发：5
- 速率：30 RPM

联系方式：TG @xiaobai_ai
适合轻度使用的同学。

⚠️ 个人运营，不保证 SLA`,
      author: "xiaobai",
      publishedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}
