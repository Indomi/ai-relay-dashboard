import { ExtractedProvider } from "./types";
import { aiConfig } from "./config";

// 第一步：从帖子中提取商家链接
const LINK_EXTRACTION_PROMPT = `你是一个链接提取助手。请从帖子内容中提取所有可能的AI中转商官网链接。

请返回JSON格式：
{
  "links": [
    {
      "url": "网站链接",
      "name": "商家名称（如果能从上下文推断）",
      "type": "官网/介绍页/其他"
    }
  ]
}

注意：
1. 只提取看起来像AI中转商的链接
2. 忽略论坛链接、社交媒体链接
3. 如果没有找到链接，返回 {"links": []}`;

// 第二步：从商家官网提取详细信息（增强版）
const DETAIL_EXTRACTION_PROMPT = `你是一个专业的AI中转商信息提取助手。请从网页内容中提取AI中转服务商的关键信息。

【重要过滤规则】以下情况必须返回 {"confidence": 0}：
1. 网站是GitHub代码仓库（github.com域名）
2. 网站是软件产品（如虚拟机、浏览器插件、桌面应用）
3. 网站是检测/评测工具（如中转站检测、API测试工具）
4. 网站是博客/文章/教程（个人博客、技术文章）
5. 网站是开源项目文档
6. 网站内容与API中转无关（如AI绘画工具、视频播放器）

【注意：以下类型是有效的，应该保留】
- 拼车/共享订阅服务（共享API订阅降低成本）
- 会员代充/账号销售服务（提供API访问权限）
- 只要是提供AI模型API访问的服务都应该保留

请提取以下字段（JSON格式）：
{
  "name": "商家名称（必填）",
  "website": "官网链接",
  "contact": "联系方式，如微信/TG/QQ/邮箱",
  "description": "商家简介（一句话描述）",

  "models": [
    {
      "model": "模型名称，如gpt-4o、claude-3.5-sonnet",
      "inputPrice": 输入价格数字（每1M tokens）,
      "outputPrice": 输出价格数字（每1M tokens）,
      "currency": "货币，如CNY/USD"
    }
  ],

  "billingType": "计费方式：token（按量付费）/ subscription（订阅充值）/ hybrid（混合）",

  "subscriptionPlans": [
    {
      "name": "套餐名称",
      "price": 价格数字,
      "period": "周期：month/quarter/year",
      "features": ["功能1", "功能2"],
      "autoRenew": false,
      "refundRule": "退款规则描述"
    }
  ],

  "freeQuota": {
    "amount": 免费额度数字,
    "unit": "单位，如USD/CNY",
    "description": "描述，如'新用户注册送$1'"
  },
  "signupBonus": "注册奖励描述，如'注册送5元'、'首充送20%'、'新用户送$1体验金'",

  "paymentMethods": ["支付宝", "微信", "USDT", "信用卡"],
  "minTopup": 最低充值金额数字,
  "canInvoice": false,

  "termsUrl": "用户协议/服务条款链接",
  "termsSummary": "协议关键条款摘要（100字以内，重点关注：账号归属、数据隐私、责任限制、封号规则）",
  "bannedModels": ["禁止的模型或用途列表"],

  "refundSupport": "yes/partial/no/unknown",
  "refundCondition": "退款条件描述，如'余额不足10元不支持退款'",
  "compensationPolicy": "故障补偿政策，如'宕机双倍补偿'、'不可用时自动退款'",

  "supportChannels": ["客服渠道列表，如微信/TG/邮箱/工单"],
  "serviceHours": "服务时间描述",
  "sla": "服务等级协议描述",

  "concurrencyLimit": 并发限制数字,
  "rateLimit": "速率限制描述",
  "tags": ["标签1", "标签2"],
  "confidence": 0.0-1.0
}

【提取优先级】
1. 模型价格和计费模式（最重要）
2. 注册奖励和免费额度
3. 退款和补偿政策
4. 用户协议关键条款
5. 支付方式

注意：
1. 价格统一转换为 每1M tokens
2. 只提取明确提到的信息，不要猜测；如果某字段没有提到，用 null 或不包含该字段
3. 【严格过滤】如果网页不是AI中转商，必须返回 {"confidence": 0}
4. 必须返回有效的JSON格式
5. 对于疑似非中转商的网站，宁可降低confidence也不要误判`;

// 第三步：从用户协议页面提取关键条款
const TERMS_EXTRACTION_PROMPT = `你是一个法律条款分析助手。请从用户协议/服务条款内容中提取与用户权益相关的关键信息。

请返回JSON格式：
{
  "termsSummary": "关键条款摘要（150字以内）",
  "accountOwnership": "账号归属说明",
  "dataPrivacy": "数据隐私保护说明",
  "liabilityLimitation": "责任限制条款",
  "banRules": "封号/限制规则",
  "refundPolicy": "退款政策",
  "compensationPolicy": "补偿政策",
  "prohibitedUses": ["禁止的用途列表"],
  "serviceGuarantee": "服务保障承诺",
  "disputeResolution": "争议解决方式"
}

注意：
1. 只提取明确写到的条款，不要推测
2. 如果某个方面没有提到，用 null
3. 重点提取与用户权益相关的内容`;

// 从帖子中提取链接
export async function extractLinksFromPost(
  title: string,
  content: string
): Promise<{ url: string; name: string }[]> {
  if (!aiConfig.apiKey) {
    console.warn("[Link Extractor] API key not configured");
    return [];
  }

  const fullText = `标题：${title}\n\n内容：\n${content}`;

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: LINK_EXTRACTION_PROMPT },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[Link Extractor] API error:", response.status);
      return [];
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      return [];
    }

    const result = JSON.parse(content_text);
    return result.links || [];
  } catch (error) {
    console.error("[Link Extractor] Error:", error);
    return [];
  }
}

// 访问网站并获取内容
export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    console.log(`[Website Fetcher] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`[Website Fetcher] Failed: ${response.status}`);
      return "";
    }

    const html = await response.text();

    // 简单提取文本内容
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

    text = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (text.length > 10000) {
      text = text.substring(0, 10000);
    }

    console.log(`[Website Fetcher] Content length: ${text.length}`);
    return text;
  } catch (error) {
    console.error(`[Website Fetcher] Error fetching ${url}:`, error);
    return "";
  }
}

// 从网站内容提取商家信息
export async function extractProviderFromWebsite(
  url: string,
  websiteContent: string,
  postContext?: { title: string; content: string }
): Promise<ExtractedProvider | null> {
  if (!aiConfig.apiKey) {
    console.warn("[Detail Extractor] API key not configured");
    return null;
  }

  const fullText = `网站链接：${url}

网站内容：
${websiteContent}

${postContext ? `帖子上下文：\n标题：${postContext.title}\n内容：${postContext.content}` : ""}`;

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: DETAIL_EXTRACTION_PROMPT },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("[Detail Extractor] API error:", response.status);
      return null;
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      return null;
    }

    console.log("[Detail Extractor] Raw response:", content_text.substring(0, 200));

    let result: ExtractedProvider;
    try {
      result = JSON.parse(content_text) as ExtractedProvider;
    } catch {
      const jsonMatch = content_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]) as ExtractedProvider;
      } else {
        return null;
      }
    }

    if (result.confidence < 0.3) {
      console.log("[Detail Extractor] Low confidence, skipping");
      return null;
    }

    // 二次过滤
    const websiteLower = (result.website || url).toLowerCase();
    const nameLower = (result.name || "").toLowerCase();
    const descriptionLower = (result.description || "").toLowerCase();
    const tagsLower = (result.tags || []).join(" ").toLowerCase();

    if (websiteLower.includes("github.com")) {
      console.log("[Detail Extractor] Filtered: GitHub repository");
      return null;
    }

    if (nameLower.includes("parallels") || nameLower.includes("vmware") ||
        nameLower.includes("virtualbox") || descriptionLower.includes("虚拟机")) {
      console.log("[Detail Extractor] Filtered: Virtual machine software");
      return null;
    }

    if (nameLower.includes("probe") ||
        (nameLower.includes("检测") && !nameLower.includes("中转")) ||
        (nameLower.includes("评测") && !nameLower.includes("中转")) ||
        tagsLower.includes("检测工具")) {
      console.log("[Detail Extractor] Filtered: Detection/testing tool");
      return null;
    }

    if (websiteLower.includes("blog.") || websiteLower.includes(".blog")) {
      console.log("[Detail Extractor] Filtered: Personal blog");
      return null;
    }

    if (!result.website || result.website === "" ||
        result.website === "点击前往" ||
        !result.website.startsWith("http")) {
      console.log("[Detail Extractor] Filtered: Invalid website");
      return null;
    }

    if (!result.website) {
      result.website = url;
    }

    console.log(`[Detail Extractor] Extracted: ${result.name} (confidence: ${result.confidence})`);
    return result;
  } catch (error) {
    console.error("[Detail Extractor] Error:", error);
    return null;
  }
}

// 从用户协议页面提取条款信息
export async function extractTermsInfo(
  termsContent: string
): Promise<{
  termsSummary?: string;
  refundPolicy?: string;
  compensationPolicy?: string;
  bannedModels?: string[];
} | null> {
  if (!aiConfig.apiKey || !termsContent || termsContent.length < 50) {
    return null;
  }

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: TERMS_EXTRACTION_PROMPT },
          { role: "user", content: termsContent },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;
    if (!content_text) return null;

    return JSON.parse(content_text);
  } catch (error) {
    console.error("[Terms Extractor] Error:", error);
    return null;
  }
}

// 查找用户协议链接
function findTermsLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const patterns = [
    /href=["']([^"']*(?:terms|tos|agreement|privacy|policy|服务条款|用户协议|隐私)[^"']*)["']/gi,
    /href=["']([^"']*(?:about|关于)[^"']*)["']/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      let href = match[1];
      if (href.startsWith("/")) {
        try {
          href = new URL(href, baseUrl).href;
        } catch { continue; }
      }
      if (href.startsWith("http") && !links.includes(href)) {
        links.push(href);
      }
    }
  }

  return links.slice(0, 3);
}

// 完整的多页面深度提取流程
export async function extractProviderWithDeepCrawl(
  title: string,
  content: string
): Promise<ExtractedProvider[]> {
  const providers: ExtractedProvider[] = [];

  // 第一步：从帖子中提取链接
  const links = await extractLinksFromPost(title, content);
  console.log(`[Deep Crawl] Found ${links.length} links in post`);

  // 第二步：访问每个链接，提取详细信息
  for (const link of links.slice(0, 3)) {
    try {
      const websiteContent = await fetchWebsiteContent(link.url);

      if (websiteContent) {
        const provider = await extractProviderFromWebsite(
          link.url,
          websiteContent,
          { title, content }
        );

        if (provider) {
          // 第三步：尝试获取用户协议页面
          const baseUrl = provider.website || link.url;
          const termsLinks = findTermsLinks(websiteContent, baseUrl);

          if (termsLinks.length > 0) {
            console.log(`[Deep Crawl] Found ${termsLinks.length} terms links`);
            for (const termsUrl of termsLinks.slice(0, 1)) {
              try {
                const termsContent = await fetchWebsiteContent(termsUrl);
                if (termsContent) {
                  const termsInfo = await extractTermsInfo(termsContent);
                  if (termsInfo) {
                    if (termsInfo.termsSummary) provider.termsSummary = termsInfo.termsSummary;
                    if (termsInfo.refundPolicy) provider.refundCondition = termsInfo.refundPolicy;
                    if (termsInfo.compensationPolicy) provider.compensationPolicy = termsInfo.compensationPolicy;
                    if (termsInfo.bannedModels) provider.bannedModels = termsInfo.bannedModels;
                    provider.termsUrl = termsUrl;
                    console.log(`[Deep Crawl] Terms info extracted`);
                  }
                }
                await new Promise((r) => setTimeout(r, 1500));
              } catch (e) {
                console.error(`[Deep Crawl] Error fetching terms:`, e);
              }
            }
          }

          providers.push(provider);
        }
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`[Deep Crawl] Error processing ${link.url}:`, error);
    }
  }

  return providers;
}

// 原有的单步提取（保留作为备用）
export async function extractProviderFromPost(
  title: string,
  content: string
): Promise<ExtractedProvider | null> {
  if (!aiConfig.apiKey) {
    console.warn("[AI Extractor] API key not configured, skipping extraction");
    return null;
  }

  const SYSTEM_PROMPT = `你是一个专业的AI中转商信息提取助手。请从用户提供的帖子内容中提取AI中转服务商的关键信息。

请提取以下字段（JSON格式）：
{
  "name": "商家名称（必填）",
  "website": "官网链接",
  "contact": "联系方式",
  "description": "商家简介",
  "models": [{"model": "模型名称", "inputPrice": 输入价格, "outputPrice": 输出价格, "currency": "CNY/USD"}],
  "billingType": "token/subscription/hybrid",
  "subscriptionPlans": [{"name": "套餐名", "price": 价格, "period": "月/季/年", "features": []}],
  "freeQuota": {"amount": 数字, "unit": "CNY/USD", "description": "描述"},
  "signupBonus": "注册奖励描述",
  "paymentMethods": ["支付方式"],
  "refundSupport": "yes/partial/no/unknown",
  "refundCondition": "退款条件",
  "compensationPolicy": "补偿政策",
  "termsUrl": "协议链接",
  "termsSummary": "协议摘要",
  "supportChannels": ["客服渠道"],
  "tags": ["标签"],
  "confidence": 0.0-1.0
}

注意：
1. 只提取明确提到的信息，不要猜测
2. 如果帖子明显不是AI中转商广告，返回 {"confidence": 0}
3. 必须返回有效的JSON格式`;

  const fullText = `标题：${title}\n\n内容：\n${content}`;

  try {
    const response = await fetch(`${aiConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: fullText },
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[AI Extractor] API Error Response:", errorBody);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;

    if (!content_text) {
      console.warn("[AI Extractor] Empty response from API");
      return null;
    }

    console.log("[AI Extractor] Raw response:", content_text.substring(0, 200));

    let result: ExtractedProvider;
    try {
      result = JSON.parse(content_text) as ExtractedProvider;
    } catch {
      const jsonMatch = content_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]) as ExtractedProvider;
      } else {
        console.error("[AI Extractor] No JSON found in response");
        return null;
      }
    }

    if (result.confidence < 0.3) {
      console.log("[AI Extractor] Low confidence, skipping");
      return null;
    }

    console.log(`[AI Extractor] Extracted: ${result.name} (confidence: ${result.confidence})`);
    return result;
  } catch (error) {
    console.error("[AI Extractor] Error:", error);
    return null;
  }
}
