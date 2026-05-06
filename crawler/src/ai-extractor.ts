import { ExtractedProvider } from "./types";
import { aiConfig } from "./config";

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

export async function extractProviderFromPost(
  title: string,
  content: string
): Promise<ExtractedProvider | null> {
  if (!aiConfig.apiKey) {
    console.warn("[AI Extractor] API key not configured, skipping extraction");
    return null;
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

    // 尝试解析 JSON
    let result: ExtractedProvider;
    try {
      result = JSON.parse(content_text) as ExtractedProvider;
    } catch (parseError) {
      // 尝试提取 JSON 部分
      const jsonMatch = content_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0]) as ExtractedProvider;
        } catch {
          console.error("[AI Extractor] Failed to parse JSON:", content_text);
          return null;
        }
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

// 批量提取
export async function extractProvidersFromPosts(
  posts: { title: string; content: string }[]
): Promise<(ExtractedProvider | null)[]> {
  const results: (ExtractedProvider | null)[] = [];

  for (const post of posts) {
    const result = await extractProviderFromPost(post.title, post.content);
    results.push(result);
    // 避免速率限制
    await new Promise(r => setTimeout(r, 500));
  }

  return results;
}
