import { RawPost } from "../types";

// V2EX 关键词搜索
const KEYWORDS = [
  "API中转",
  "OpenAI代理",
  "GPT充值",
  "Claude中转",
  "AI API",
];

// 模拟数据生成器（包含评论内容）
export function generateMockV2EXPosts(): RawPost[] {
  return [
    {
      url: "https://v2ex.com/t/123456",
      platform: "v2ex",
      title: "推荐一个稳定快速的API中转站 - 极速API",
      content: `用了半年多了，非常稳定。

支持模型：
- GPT-4o: ¥8/1M tokens
- GPT-4o-mini: ¥1.5/1M tokens
- Claude 3.5 Sonnet: ¥12/1M tokens
- Gemini 2.0 Flash: ¥3/1M tokens

计费方式：按量计费
新用户送 $5 免费额度
联系方式：TG @jsapi_admin
官网：https://jsapi.example.com

响应速度 300ms 左右，推荐！

【评论内容】
@user001: 楼主推荐的中转站我试了，确实不错！另外推荐一个我用的：OpenKey，价格更便宜，GPT-4o 只要 ¥6/1M，官网 openkey.example.com
@user002: 极速API 用了三个月，很稳定。TG 回复也快，有问题随时解决。
@seller_a: 我们是极速API官方，感谢推荐！新用户注册送 $10，加 TG @jsapi_admin 领取
@user003: 求推荐支持 o1 模型的中转站
@seller_b: 我们支持 o1！AI Hub Pro，官网 aihubpro.example.com，o1-preview ¥15/1M，联系 support@aihubpro.example.com
@user004: 楼主这个有并发限制吗？
@seller_a: @user004 极速API 无并发限制，按量计费，随用随付`,
      author: "techfan01",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
    {
      url: "https://v2ex.com/t/123457",
      platform: "v2ex",
      title: "CloudBridge AI 订阅制体验分享",
      content: `之前一直用按量计费，最近试了 CloudBridge 的订阅制，感觉不错。

套餐：
- 基础版 ¥49/月：GPT-4o 100万token + Claude 50万token
- 专业版 ¥149/月：GPT-4o 500万token + Claude 300万token + 所有模型
- 企业版 ¥499/月：无限token

支持的模型很全：
GPT-4o、GPT-4o-mini、Claude 3.5 Sonnet、Claude 3 Opus、Gemini 2.0 Flash、Gemini 2.5 Pro、DeepSeek V3

联系方式：微信 cloudbridge_kefu
官网：https://cloudbridge.example.com

适合用量大的朋友。

【评论内容】
@cloudbridge_official: 感谢分享！本月新用户首月 8 折优惠，微信 cloudbridge_kefu 咨询
@user005: 订阅制确实适合团队，我们公司用的企业版
@user006: 有没有按量计费的？用量不大
@seller_c: @user006 推荐小白的AI铺子，个人卖家，价格最低，GPT-4o ¥5/1M，TG @xiaobai_ai
@user007: CloudBridge 客服响应很快，有问题都能及时解决
@user008: 求推荐支持 Claude 3.5 的中转站
@cloudbridge_official: @user008 我们支持 Claude 3.5 Sonnet 和 Opus，订阅制和按量都有`,
      author: "dev_master",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      fetchedAt: new Date().toISOString(),
    },
  ];
}

// 真实爬取函数（包含评论）
export async function crawlV2EX(): Promise<RawPost[]> {
  // 实际实现需要：
  // 1. 搜索关键词获取帖子列表
  // 2. 访问每个帖子详情页
  // 3. 提取帖子内容 + 所有评论
  // 4. 合并内容用于 AI 提取

  console.log("[V2EX] Crawler initialized (using mock data for demo)");
  return generateMockV2EXPosts();
}

// 解析 V2EX 时间格式
function parseV2EXTime(timeText: string): string {
  const now = new Date();

  if (timeText.includes("前")) {
    const hourMatch = timeText.match(/(\d+)\s*小时/);
    const minMatch = timeText.match(/(\d+)\s*分钟/);
    const dayMatch = timeText.match(/(\d+)\s*天/);

    if (dayMatch) {
      now.setDate(now.getDate() - parseInt(dayMatch[1]));
    }
    if (hourMatch) {
      now.setHours(now.getHours() - parseInt(hourMatch[1]));
    }
    if (minMatch) {
      now.setMinutes(now.getMinutes() - parseInt(minMatch[1]));
    }
  } else if (timeText.match(/\d{4}-\d{2}-\d{2}/)) {
    return new Date(timeText).toISOString();
  }

  return now.toISOString();
}
