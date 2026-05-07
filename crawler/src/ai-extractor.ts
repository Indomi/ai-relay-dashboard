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

// 第二步：从商家官网提取详细信息
const DETAIL_EXTRACTION_PROMPT = `你是一个专业的AI中转商信息提取助手。请从网页内容中提取AI中转服务商的关键信息。

【重要过滤规则】以下情况必须返回 {"confidence": 0}：
1. 网站是GitHub代码仓库（github.com域名）
2. 网站是软件产品（如虚拟机、浏览器插件、桌面应用）
3. 网站是检测/评测工具（如中转站检测、API测试工具）
4. 网站是会员代充/账号销售服务（ChatGPT Plus代充、账号批发）
5. 网站是博客/文章/教程（个人博客、技术文章）
6. 网站是拼车/共享订阅服务
7. 网站是开源项目文档
8. 网站内容与API中转无关（如AI绘画工具、视频播放器）

【AI中转商定义】必须同时满足：
- 提供OpenAI/Claude等AI模型的API代理服务
- 有按量计费或订阅制的API调用服务
- 提供API key供开发者调用

请提取以下字段（JSON格式）：
{
  "name": "商家名称（必填）",
  "website": "官网链接",
  "contact": "联系方式，如微信/TG/QQ/邮箱（可选）",
  "description": "商家简介（可选）",
  "models": [
    {
      "model": "模型名称，如gpt-4o、claude-3.5-sonnet",
      "inputPrice": 输入价格数字（每1M tokens）,
      "outputPrice": 输出价格数字（每1M tokens）,
      "currency": "货币，如CNY/USD"
    }
  ],
  "billingType": "计费方式：token/subscription/hybrid",
  "subscriptionPlans": [
    {
      "name": "套餐名称",
      "price": 价格数字,
      "period": "周期，如月/季/年",
      "features": ["功能1", "功能2"]
    }
  ],
  "freeQuota": {
    "amount": 免费额度数字,
    "unit": "单位，如USD/CNY"
  },
  "paymentMethods": ["支付方式列表"],
  "concurrencyLimit": 并发限制数字（可选）,
  "rateLimit": "速率限制描述（可选）",
  "tags": ["标签1", "标签2"],
  "confidence": 0.0-1.0 的置信度分数
}

注意：
1. 价格统一转换为 每1M tokens
2. 只提取明确提到的信息，不要猜测
3. 【严格过滤】如果网页不是AI中转商，必须返回 {"confidence": 0}
4. 必须返回有效的JSON格式
5. 对于疑似非中转商的网站，宁可降低confidence也不要误判`;

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
    // 移除 script 和 style 标签
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");

    // 提取文本
    text = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 限制长度
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
        max_tokens: 2000,
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

    // 代码层面二次过滤：排除明显不是中转商的网站
    const websiteLower = (result.website || url).toLowerCase();
    const nameLower = (result.name || "").toLowerCase();
    const descriptionLower = (result.description || "").toLowerCase();
    const tagsLower = (result.tags || []).join(" ").toLowerCase();
    
    // 排除GitHub仓库
    if (websiteLower.includes("github.com")) {
      console.log("[Detail Extractor] Filtered: GitHub repository");
      return null;
    }
    
    // 排除虚拟机/软件产品
    if (nameLower.includes("parallels") || nameLower.includes("vmware") || 
        nameLower.includes("virtualbox") || descriptionLower.includes("虚拟机")) {
      console.log("[Detail Extractor] Filtered: Virtual machine software");
      return null;
    }
    
    // 排除检测/评测工具
    if (nameLower.includes("probe") || nameLower.includes("检测") || 
        nameLower.includes("评测") || tagsLower.includes("检测工具")) {
      console.log("[Detail Extractor] Filtered: Detection/testing tool");
      return null;
    }
    
    // 排除会员代充/账号销售
    if (nameLower.includes("代充") || nameLower.includes("充值") || 
        descriptionLower.includes("代充") || descriptionLower.includes("会员充值") ||
        tagsLower.includes("会员充值") || tagsLower.includes("代充")) {
      console.log("[Detail Extractor] Filtered: Recharge/reseller service");
      return null;
    }
    
    // 排除拼车服务
    if (nameLower.includes("拼车") || descriptionLower.includes("拼车")) {
      console.log("[Detail Extractor] Filtered: Carpool service");
      return null;
    }
    
    // 排除个人博客
    if (websiteLower.includes("blog.") || websiteLower.includes(".blog")) {
      console.log("[Detail Extractor] Filtered: Personal blog");
      return null;
    }
    
    // 排除无效网站
    if (!result.website || result.website === "" || 
        result.website === "点击前往" || 
        !result.website.startsWith("http")) {
      console.log("[Detail Extractor] Filtered: Invalid website");
      return null;
    }

    // 确保有网站链接
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

// 完整的两步提取流程
export async function extractProviderWithDeepCrawl(
  title: string,
  content: string
): Promise<ExtractedProvider[]> {
  const providers: ExtractedProvider[] = [];

  // 第一步：从帖子中提取链接
  const links = await extractLinksFromPost(title, content);
  console.log(`[Deep Crawl] Found ${links.length} links in post`);

  // 第二步：访问每个链接，提取详细信息
  for (const link of links.slice(0, 3)) { // 限制最多3个链接
    try {
      const websiteContent = await fetchWebsiteContent(link.url);

      if (websiteContent) {
        const provider = await extractProviderFromWebsite(
          link.url,
          websiteContent,
          { title, content }
        );

        if (provider) {
          providers.push(provider);
        }
      }

      // 避免请求过快
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
  "website": "官网链接（可选）",
  "contact": "联系方式，如微信/TG/QQ（可选）",
  "models": [
    {
      "model": "模型名称，如gpt-4o、claude-3.5-sonnet",
      "inputPrice": 输入价格数字（可选）,
      "outputPrice": 输出价格数字（可选）,
      "currency": "货币，如CNY/USD（可选）"
    }
  ],
  "billingType": "计费方式：token/subscription/hybrid（可选）",
  "subscriptionPlans": [
    {
      "name": "套餐名称",
      "price": 价格数字,
      "period": "周期，如月/季/年",
      "features": ["功能1", "功能2"]
    }
  ],
  "freeQuota": {
    "amount": 免费额度数字,
    "unit": "单位，如USD/CNY"
  },
  "paymentMethods": ["支付方式列表"],
  "concurrencyLimit": 并发限制数字（可选）,
  "rateLimit": "速率限制描述（可选）",
  "tags": ["标签1", "标签2"],
  "confidence": 0.0-1.0 的置信度分数
}

注意：
1. 如果信息不确定，confidence 请给低分（<0.5）
2. 价格统一转换为 元/1M tokens 或 USD/1M tokens
3. 只提取明确提到的信息，不要猜测
4. 如果帖子明显不是AI中转商广告，返回 {"confidence": 0}
5. 必须返回有效的JSON格式，不要添加任何其他文字说明`;

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
        max_tokens: 2000,
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
