import { RawPost } from "../types";

// 全网搜索爬虫 - 通过多个搜索引擎发现 AI 中转商相关信息
// 使用无需 API Key 的公开搜索接口

const SEARCH_QUERIES = [
  "AI API 中转站 推荐 2025 2026",
  "OpenAI API 代理 国内 中转",
  "GPT API 中转站 价格对比",
  "Claude API 国内代理 中转",
  "one-api new-api 中转站",
  "AI大模型 API 中转 价格",
  "ChatGPT API 中转站 充值",
  "AI API relay proxy 国内",
];

// 搜索引擎接口
const SEARCH_ENGINES = [
  {
    name: "duckduckgo",
    buildUrl: function(query: string, page: number) {
      return "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query) + "&s=" + (page * 30);
    },
    parseResults: function(html: string): Array<{ title: string; url: string; snippet: string }> {
      var results: Array<{ title: string; url: string; snippet: string }> = [];
      // DuckDuckGo HTML 搜索结果格式
      var blocks = html.split('class="result__body"');
      for (var i = 1; i < blocks.length; i++) {
        var block = blocks[i];
        var titleMatch = block.match(/class="result__a"[^>]*>([^<]+)/);
        var urlMatch = block.match(/class="result__url"[^>]*>([^<]+)/);
        var snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);

        if (titleMatch && urlMatch) {
          var title = titleMatch[1].replace(/<\/?[^>]+>/g, "").trim();
          var url = urlMatch[1].replace(/<\/?[^>]+>/g, "").trim();
          var snippet = snippetMatch ? snippetMatch[1].replace(/<\/?[^>]+>/g, "").trim() : "";

          if (url && !url.startsWith("//")) {
            results.push({ title: title, url: url, snippet: snippet });
          }
        }
      }
      return results;
    },
  },
  {
    name: "bing",
    buildUrl: function(query: string, page: number) {
      return "https://www.bing.com/search?q=" + encodeURIComponent(query) + "&first=" + (page * 10 + 1) + "&count=10";
    },
    parseResults: function(html: string): Array<{ title: string; url: string; snippet: string }> {
      var results: Array<{ title: string; url: string; snippet: string }> = [];
      // Bing 搜索结果格式
      var regex = /<li class="b_algo"[^>]*>[\s\S]*?<h2><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g;
      var match;
      while ((match = regex.exec(html)) !== null) {
        var url = match[1];
        var title = match[2].replace(/<\/?[^>]+>/g, "").trim();
        var snippet = match[3].replace(/<\/?[^>]+>/g, "").trim();
        if (url && title) {
          results.push({ title: title, url: url, snippet: snippet });
        }
      }
      return results;
    },
  },
  {
    name: "google_cache",
    buildUrl: function(query: string, page: number) {
      return "https://www.google.com/search?q=" + encodeURIComponent(query) + "&num=10&start=" + (page * 10);
    },
    parseResults: function(html: string): Array<{ title: string; url: string; snippet: string }> {
      var results: Array<{ title: string; url: string; snippet: string }> = [];
      // Google 搜索结果格式
      var regex = /<div class="g"[^>]*>[\s\S]*?<h3[^>]*><a[^>]*href="\/url\?q=([^"&]+)&[^"]*"[^>]*>([\s\S]*?)<\/a><\/h3>[\s\S]*?<div[^>]*data-sncf[^>]*>([\s\S]*?)<\/div>/g;
      var match;
      while ((match = regex.exec(html)) !== null) {
        var url = match[1];
        var title = match[2].replace(/<\/?[^>]+>/g, "").trim();
        var snippet = match[3].replace(/<\/?[^>]+>/g, "").trim();
        if (url && title) {
          results.push({ title: title, url: url, snippet: snippet });
        }
      }
      // 备用正则
      if (results.length === 0) {
        var regex2 = /<a href="\/url\?q=([^"&]+)&[^"]*"[^>]*>([^<]+)<\/a>/g;
        while ((match = regex2.exec(html)) !== null) {
          var url2 = match[1];
          var title2 = match[2].trim();
          if (url2 && title2 && !url2.startsWith("http://webcache") && !url2.startsWith("http://translate")) {
            results.push({ title: title2, url: url2, snippet: "" });
          }
        }
      }
      return results;
    },
  },
];

// 内容预过滤关键词
var CONTENT_FILTER = [
  "中转", "api key", "openai", "claude", "gpt", "token",
  "proxy", "relay", "one-api", "new-api", "充值", "额度",
  "按量", "模型", "接口", "转发",
];

// 排除的域名（非商家网站）
var EXCLUDE_DOMAINS = [
  "github.com", "stackoverflow.com", "youtube.com", "bilibili.com",
  "zhihu.com", "weibo.com", "twitter.com", "facebook.com",
  "pinterest.com", "instagram.com", "tiktok.com",
  "wikipedia.org", "baike.baidu.com", "docs.google.com",
  "play.google.com", "apps.apple.com",
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

// 搜索引擎搜索
async function searchEngine(
  engine: typeof SEARCH_ENGINES[0],
  query: string,
  maxPages: number
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  var allResults: Array<{ title: string; url: string; snippet: string }> = [];
  var seenUrls = new Set<string>();

  for (var page = 0; page < maxPages; page++) {
    try {
      var url = engine.buildUrl(query, page);
      console.log("WebSearch " + engine.name + " page " + page + ": " + query.substring(0, 30));

      var response = await fetch(url, { headers: HEADERS, redirect: "follow" });

      if (!response.ok) {
        console.log("WebSearch " + engine.name + " HTTP " + response.status);
        break;
      }

      var html = await response.text();
      var results = engine.parseResults(html);

      if (results.length === 0) {
        console.log("WebSearch " + engine.name + " no results parsed");
        break;
      }

      for (var i = 0; i < results.length; i++) {
        var r = results[i];
        if (!seenUrls.has(r.url) && !shouldExclude(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }

      console.log("WebSearch " + engine.name + " found " + results.length + " results (total: " + allResults.length + ")");
      await sleep(3000);
    } catch (error) {
      console.log("WebSearch " + engine.name + " error: " + error);
      break;
    }
  }

  return allResults;
}

// 抓取搜索结果页面的详细内容
async function fetchPageContent(url: string): Promise<{ title: string; content: string } | null> {
  try {
    var response = await fetch(url, {
      headers: HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return null;

    var html = await response.text();
    if (html.length < 200) return null;

    // 提取标题
    var title = "";
    var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // 提取正文 - 尝试多种策略
    var content = "";

    // 策略1: 提取 meta description
    var descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
    if (descMatch) {
      content = descMatch[1];
    }

    // 策略2: 提取 article 或 main 内容
    var mainMatch = html.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
    if (mainMatch && mainMatch[2].length > content.length) {
      content = stripHtml(mainMatch[2]);
    }

    // 策略3: 提取所有 p 标签
    if (content.length < 100) {
      var paragraphs: string[] = [];
      var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      var pMatch;
      while ((pMatch = pRegex.exec(html)) !== null) {
        var text = stripHtml(pMatch[1]);
        if (text.length > 20) {
          paragraphs.push(text);
        }
      }
      content = paragraphs.join("\n");
    }

    // 策略4: 提取 body 文本（最后手段）
    if (content.length < 50) {
      var bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        content = stripHtml(bodyMatch[1]).substring(0, 5000);
      }
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

  // 使用 DuckDuckGo（最可靠，不需要 JS 渲染）
  var engine = SEARCH_ENGINES[0]; // duckduckgo

  for (var qi = 0; qi < SEARCH_QUERIES.length; qi++) {
    var query = SEARCH_QUERIES[qi];
    console.log("WebSearch Query " + (qi + 1) + "/" + SEARCH_QUERIES.length + ": " + query);

    try {
      var results = await searchEngine(engine, query, 2); // 每个查询2页

      for (var ri = 0; ri < results.length; ri++) {
        var result = results[ri];
        if (seenUrls.has(result.url)) continue;

        // 内容预过滤
        var filterText = result.title + " " + result.snippet;
        if (!passesContentFilter(filterText)) {
          continue;
        }

        seenUrls.add(result.url);
        console.log("WebSearch Relevant: " + result.title.substring(0, 60));

        // 抓取页面详情
        var pageContent = await fetchPageContent(result.url);
        if (pageContent) {
          var fullContent = result.snippet + "\n\n" + pageContent.content;
          posts.push({
            url: result.url,
            platform: "websearch",
            title: pageContent.title || result.title,
            content: fullContent,
            author: "",
            publishedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
          });
        } else {
          // 即使无法抓取详情，也保留搜索摘要
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
    } catch (error) {
      console.log("WebSearch Error for query '" + query + "': " + error);
    }
  }

  // 如果 DuckDuckGo 结果不足，尝试 Bing
  if (posts.length < 10) {
    console.log("WebSearch Trying Bing as fallback...");
    var bingEngine = SEARCH_ENGINES[1];
    var fallbackQueries = SEARCH_QUERIES.slice(0, 4);

    for (var fi = 0; fi < fallbackQueries.length; fi++) {
      var fquery = fallbackQueries[fi];
      try {
        var fresults = await searchEngine(bingEngine, fquery, 1);
        for (var fri = 0; fri < fresults.length; fri++) {
          var fr = fresults[fri];
          if (seenUrls.has(fr.url)) continue;
          if (!passesContentFilter(fr.title + " " + fr.snippet)) continue;

          seenUrls.add(fr.url);
          console.log("WebSearch Bing: " + fr.title.substring(0, 60));

          posts.push({
            url: fr.url,
            platform: "websearch",
            title: fr.title,
            content: fr.snippet,
            author: "",
            publishedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
          });
        }
        await sleep(3000);
      } catch (error) {
        console.log("WebSearch Bing error: " + error);
      }
    }
  }

  console.log("WebSearch Total posts: " + posts.length);
  return posts;
}
