import { CheerioCrawler } from "crawlee";
import { RawPost } from "../types";

const BASE_URL = "https://linux.do";

export async function crawlLinuxDo(): Promise<RawPost[]> {
  console.log("[Linux.do] Crawler initialized (using mock data for demo)");
  return generateMockLinuxDoPosts();
}

export function generateMockLinuxDoPosts(): RawPost[] {
  return [
    {
      url: "https://linux.do/t/456789",
      platform: "linux.do",
      title: "CloudBridge AI 订阅制体验分享",
      content: `从按量计费转到订阅制一个月了，来分享一下。

CloudBridge 的订阅方案：

基础版 ¥49/月：
- GPT-4o 100万token
- Claude 50万token
- 基础客服

专业版 ¥149/月：
- GPT-4o 500万token
- Claude 300万token
- 所有模型
- 优先客服

企业版 ¥499/月：
- 无限token
- SLA保障

模型覆盖很全：GPT-4o、Claude 3.5 Sonnet、Claude 3 Opus、Gemini系列、DeepSeek

免费额度：$10
支付方式：支付宝、微信

官网：https://cloudbridge.example.com
微信：cloudbridge_kefu

适合用量稳定的场景，比按量计费省30%左右。`,
      author: "linux_fan",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
    {
      url: "https://linux.do/t/567890",
      platform: "linux.do",
      title: "最稳定的AI API中转站推荐",
      content: `用过好几家中转，目前最稳的是 AI Hub Pro。

用了快一年了，几乎没遇到过故障。

价格虽然不算最低，但稳定性值得：
- GPT-4o: ¥12/1M
- Claude 3.5: ¥15/1M
- Gemini 2.5 Pro: ¥20/1M

订阅制：
- 体验版 ¥29/月：100万token
- 标准版 ¥99/月：500万token
- 旗舰版 ¥299/月：2000万token

响应速度：120ms（非常快）
并发：50

免费额度：$2
支付方式：支付宝、微信、信用卡

官网：https://aihubpro.example.com
邮箱：support@aihubpro.example.com

企业级用户强烈推荐。`,
      author: "linux_pro",
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}
