import { RawPost } from "../types";

// 全网搜索爬虫 - 通过 DuckDuckGo Lite 和 Bing 搜索发现 AI 中转商

var SEARCH_QUERIES = [
  "AI API 中转站 推荐",
  "OpenAI API 代理 国内",
  "GPT API 中转站 价格",
  "Claude API 国内代理",
  "one-api new-api 中转",
  "AI大模型 API 中转",
  "ChatGPT API 中转 充值",
  "AI API relay proxy",
];

var CONTENT_FILTER = [
  "中转", "api key", "openai", "claude", "gpt", "token",
  "proxy", "relay", "one-api", "new-api", "充值", "额度",
  "按量", "模型", "接口", "转发",
];

var EXCLUDE_DOMAINS = [
  "github.com", "stackoverflow.com", "youtube.com", "bilibili.com",
  "zhihu.com", "weibo.com", "twitter.com", "facebook.com",
  "pinterest.com", "instagram.com", "tiktok.com",
  "wikipedia.org", "baike.baidu.com", "docs.google.com",
  "play.google.com", "apps.apple.com", "linkedin.com",
  "reddit.com", "quora.com", "medium.com",
];

var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

function sleep(ms: number): Promise<void> {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

function shouldExclude(url: string): boolean {
  try {
    var hostname = new URL(url).hostname.toLowerCase();
    for (var i = 0; i < EXCLUDE_DOMAINS.length; i++) {
      if (hostname === EXCLUDE_DOMAINS[i] || hostname.endsWith("." + EXCLUDE_DOMAINS[i])) {
        return true;
      }
    }
  } catch (e) {
    return true;
  }
  return false;
}

function passesContentFilter(text: string): boolean {
  var lower = text.toLowerCase();
  var matchCount = 0;
  for (var i = 0; i < CONTENT_FILTER.length; i++) {
    if (lower.indexOf(CONTENT_FILTER[i]) !== -1) {
      matchCount++;
      if (matchCount >= 2) return true;
    }
  }
  return false;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// DuckDuckGo Lite 搜索（更轻量，返回纯文本结果）
async function searchDuckDuckGoLite(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  var results: Array<{ title: string; url: string; snippet: string }> = [];
  try {
    var url = "https://lite.duckduckgo.com/lite/?q=" + encodeURIComponent(query);
    console.log("WebSearch DDG Lite: " + query.substring(0, 40));

    var response = await fetch(url, { headers: HEADERS, redirect: "follow" });
    if (!response.ok) {
      console.log("WebSearch DDG Lite HTTP " + response.status);
      return results;
    }

    var html = await response.text();

    // DuckDuckGo Lite 使用标准的表格布局
    // 每个结果是一个 <tr> 包含链接和摘要
    var linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    var snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
    var links: Array<{ url: string; title: string }> = [];
    var match;

    while ((match = linkRegex.exec(html)) !== null) {
      links.push({
        url: match[1],
        title: stripHtml(match[2]),
      });
    }

    var snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(stripHtml(match[1]));
    }

    for (var i = 0; i < links.length; i++) {
      results.push({
        url: links[i].url,
        title: links[i].title,
        snippet: snippets[i] || "",
      });
    }

    console.log("WebSearch DDG Lite found " + results.length + " results");
  } catch (error) {
    console.log("WebSearch DDG Lite error: " + error);
  }
  return results;
}

// DuckDuckGo HTML 搜索（备用）
async function searchDuckDuckGoHtml(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  var results: Array<{ title: string; url: string; snippet: string }> = [];
  try {
    var url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
    console.log("WebSearch DDG HTML: " + query.substring(0, 40));

    var response = await fetch(url, { headers: HEADERS, redirect: "follow" });
    if (!response.ok) return results;

    var html = await response.text();

    // 更通用的解析方式 - 查找所有搜索结果链接
    // DDG HTML 版本中，结果链接通常在 <a class="result__a" href="..."> 中
    // 但实际 URL 可能在 redirect URL 中
    var resultBlocks = html.split('result__body');
    for (var i = 1; i < resultBlocks.length; i++) {
      var block = resultBlocks[i];

      // 提取链接 - DDG 使用 redirect URL: //duckduckgo.com/l/?uddg=ENCODED_URL
      var hrefMatch = block.match(/href="(\/\/duckduckgo\.com\/l\/\?uddg=([^"&]+)[^"]*)"/);
      var titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      var snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|span|div)/);

      if (hrefMatch) {
        var redirectUrl = decodeURIComponent(hrefMatch[2]);
        var title = titleMatch ? stripHtml(titleMatch[1]) : "";
        var snippet = snippetMatch ? stripHtml(snippetMatch[1]) : "";

        if (redirectUrl && title) {
          results.push({ url: redirectUrl, title: title, snippet: snippet });
        }
      }
    }

    // 备用：直接查找所有外部链接
    if (results.length === 0) {
      var urlRegex = /href="(https?:\/\/(?!duckduckgo\.com)[^"]+)"/gi;
      var titleRegex2 = /<a[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      var urls: string[] = [];
      var titles: string[] = [];
      var m;
      while ((m = urlRegex.exec(html)) !== null) urls.push(m[1]);
      while ((m = titleRegex2.exec(html)) !== null) titles.push(stripHtml(m[1]));
      for (var j = 0; j < Math.min(urls.length, titles.length); j++) {
        results.push({ url: urls[j], title: titles[j], snippet: "" });
      }
    }

    console.log("WebSearch DDG HTML found " + results.length + " results");
  } catch (error) {
    console.log("WebSearch DDG HTML error: " + error);
  }
  return results;
}

// Bing 搜索
async function searchBing(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  var results: Array<{ title: string; url: string; snippet: string }> = [];
  try {
    var url = "https://www.bing.com/search?q=" + encodeURIComponent(query) + "&count=20";
    console.log("WebSearch Bing: " + query.substring(0, 40));

    var response = await fetch(url, {
      headers: Object.assign({}, HEADERS, {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      }),
      redirect: "follow",
    });
    if (!response.ok) {
      console.log("WebSearch Bing HTTP " + response.status);
      return results;
    }

    var html = await response.text();

    // Bing 搜索结果格式 - 使用多种正则匹配
    // 格式1: <li class="b_algo"><h2><a href="URL">TITLE</a></h2>...<p>SNIPPET</p></li>
    var regex1 = /<li class="b_algo"[^>]*>[\s\S]*?<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
    var match;
    while ((match = regex1.exec(html)) !== null) {
      results.push({
        url: match[1],
        title: stripHtml(match[2]),
        snippet: stripHtml(match[3]),
      });
    }

    // 格式2: <div class="b_algo"><h2><a href="URL">TITLE</a></h2>
    if (results.length === 0) {
      var regex2 = /<div class="b_algo"[^>]*>[\s\S]*?<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      while ((match = regex2.exec(html)) !== null) {
        results.push({
          url: match[1],
          title: stripHtml(match[2]),
          snippet: "",
        });
      }
    }

    // 格式3: 通用链接提取
    if (results.length === 0) {
      var regex3 = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]{10,100})<\/a>/g;
      while ((match = regex3.exec(html)) !== null) {
        var href = match[1];
        if (href.indexOf("bing.com") === -1 && href.indexOf("microsoft.com") === -1) {
          results.push({ url: href, title: match[2].trim(), snippet: "" });
        }
      }
    }

    console.log("WebSearch Bing found " + results.length + " results");
  } catch (error) {
    console.log("WebSearch Bing error: " + error);
  }
  return results;
}

// 抓取页面内容
async function fetchPageContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    var response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    var html = await response.text();
    if (html.length < 200) return null;

    var title = "";
    var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].trim();

    var content = "";

    // meta description
    var descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (!descMatch) descMatch = html.match(/<meta[^>]*content="([^"]+)"[^>]*name="description"/i);
    if (descMatch) content = descMatch[1];

    // article/main
    var mainMatch = html.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
    if (mainMatch && mainMatch[2].length > content.length) {
      content = stripHtml(mainMatch[2]).substring(0, 3000);
    }

    // 所有 p 标签
    if (content.length < 100) {
      var paragraphs: string[] = [];
      var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      var pMatch;
      while ((pMatch = pRegex.exec(html)) !== null) {
        var text = stripHtml(pMatch[1]);
        if (text.length > 20) paragraphs.push(text);
      }
      content = paragraphs.join("\n").substring(0, 3000);
    }

    return { title: title, content: content };
  } catch (error) {
    return null;
  }
}

// 主函数
export async function crawlWebSearch(): Promise<RawPost[]> {
  console.log("WebSearch Starting full-web search crawler...");
  var posts: RawPost[] = [];
  var seenUrls = new Set<string>();

  for (var qi = 0; qi < SEARCH_QUERIES.length; qi++) {
    var query = SEARCH_QUERIES[qi];
    console.log("WebSearch Query " + (qi + 1) + "/" + SEARCH_QUERIES.length + ": " + query);

    // 依次尝试 DuckDuckGo Lite -> DuckDuckGo HTML -> Bing
    var searchResults: Array<{ title: string; url: string; snippet: string }> = [];

    searchResults = await searchDuckDuckGoLite(query);
    if (searchResults.length === 0) {
      await sleep(2000);
      searchResults = await searchDuckDuckGoHtml(query);
    }
    if (searchResults.length === 0) {
      await sleep(2000);
      searchResults = await searchBing(query);
    }

    for (var ri = 0; ri < searchResults.length; ri++) {
      var result = searchResults[ri];
      if (seenUrls.has(result.url)) continue;
      if (shouldExclude(result.url)) continue;

      var filterText = result.title + " " + result.snippet;
      if (!passesContentFilter(filterText)) continue;

      seenUrls.add(result.url);
      console.log("WebSearch Relevant: " + result.title.substring(0, 60));

      // 抓取页面详情（限制数量，避免太多请求）
      if (posts.length < 20) {
        var pageContent = await fetchPageContent(result.url);
        if (pageContent && pageContent.content.length > 50) {
          posts.push({
            url: result.url,
            platform: "websearch",
            title: pageContent.title || result.title,
            content: result.snippet + "\n\n" + pageContent.content,
            author: "",
            publishedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
          });
        } else {
          posts.push({
            url: result.url,
            platform: "websearch",
            title: result.title,
            content: result.snippet,
            author: "",
            publishedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
          });
        }
      } else {
        // 超过20条只保留搜索摘要
        posts.push({
          url: result.url,
          platform: "websearch",
          title: result.title,
          content: result.snippet,
          author: "",
          publishedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        });
      }

      await sleep(2000);
    }

    await sleep(3000);
  }

  console.log("WebSearch Total posts: " + posts.length);
  return posts;
}
