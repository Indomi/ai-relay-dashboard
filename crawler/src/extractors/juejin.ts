import { RawPost } from "../types";
import * as cheerio from "cheerio";

// ============================================================
// 掘金 (Juejin) 爬虫 - 多策略真实 API 调用
// ============================================================

// 掘金 API 端点（多种备选）
var SEARCH_API = "https://api.juejin.cn/search_api/v1/search";
var CONTENT_API = "https://api.juejin.cn/content_api/v1/article/query";
var FEED_API = "https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed";

// 搜索关键词
var SEARCH_KEYWORDS = [
  "API中转",
  "OpenAI",
  "GPT",
  "Claude",
  "中转站",
  "API代理",
  "AI API",
];

// 内容预过滤关键词（命中任一则保留）
var CONTENT_FILTER_KEYWORDS = [
  "中转",
  "api",
  "openai",
  "claude",
  "gpt",
  "token",
  "proxy",
  "充值",
];

// 多种 User-Agent 备选
var USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
];

// 构建请求头
function buildApiHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    Referer: "https://juejin.cn/",
    Origin: "https://juejin.cn",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
  };
}

// 构建 HTML 页面请求头
function buildHtmlHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: "https://juejin.cn/",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
  };
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// 内容预过滤：标题或内容中是否包含目标关键词
function passesContentFilter(title: string, content: string): boolean {
  var combined = (title + " " + content).toLowerCase();
  for (var i = 0; i < CONTENT_FILTER_KEYWORDS.length; i++) {
    if (combined.indexOf(CONTENT_FILTER_KEYWORDS[i]) !== -1) {
      return true;
    }
  }
  return false;
}

// 去重
function dedupPosts(posts: RawPost[]): RawPost[] {
  var seen = new Set<string>();
  var result: RawPost[] = [];
  for (var i = 0; i < posts.length; i++) {
    if (!seen.has(posts[i].url)) {
      seen.add(posts[i].url);
      result.push(posts[i]);
    }
  }
  return result;
}

// 从搜索结果中提取文章信息并构建 RawPost
function extractArticlePost(item: any): RawPost | null {
  var articleId = item.article_id;
  if (!articleId) {
    return null;
  }

  var title = "";
  var content = "";
  var author = "";
  var ctime = "";

  if (item.article_info) {
    title = item.article_info.title || "";
    content = item.article_info.brief_content || "";
    ctime = item.article_info.ctime || "";
  } else {
    title = item.title || "";
    content = item.brief_content || "";
  }

  if (item.author_user_info) {
    author = item.author_user_info.user_name || "";
  }

  if (!title) {
    return null;
  }

  // 内容预过滤
  if (!passesContentFilter(title, content)) {
    return null;
  }

  var publishedAt = "";
  if (ctime) {
    var ts = parseInt(ctime, 10);
    if (!isNaN(ts)) {
      publishedAt = new Date(ts * 1000).toISOString();
    }
  }
  if (!publishedAt) {
    publishedAt = new Date().toISOString();
  }

  return {
    url: "https://juejin.cn/post/" + articleId,
    platform: "juejin",
    title: title,
    content: content,
    author: author || "unknown",
    publishedAt: publishedAt,
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================
// 方式1: 掘金搜索 API（主要方式，多种策略）
// POST https://api.juejin.cn/search_api/v1/search
// Body: {"query":"KEYWORD","sort_type":200,"cursor":"0","limit":20}
// ============================================================

interface SearchResponse {
  err_no: number;
  err_msg?: string;
  data?: any[];
}

async function crawlViaSearchAPI(): Promise<RawPost[]> {
  console.log("[Juejin] 方式1: 搜索 API...");
  var posts: RawPost[] = [];
  var seenIds = new Set<string>();

  for (var i = 0; i < SEARCH_KEYWORDS.length; i++) {
    var keyword = SEARCH_KEYWORDS[i];
    var found = false;

    // 策略1: 标准 search_api
    try {
      console.log("[Juejin] 搜索关键词 (策略1: search_api): " + keyword);

      var body1 = JSON.stringify({
        query: keyword,
        sort_type: 200,
        cursor: "0",
        limit: 20,
      });

      var response1 = await fetch(SEARCH_API, {
        method: "POST",
        headers: buildApiHeaders(0),
        body: body1,
      });

      if (response1.ok) {
        var data1 = (await response1.json()) as SearchResponse;
        if (data1.err_no === 0 && data1.data && data1.data.length > 0) {
          console.log("[Juejin] search_api 返回 " + data1.data.length + " 条");
          for (var j = 0; j < data1.data.length; j++) {
            var item = data1.data[j];
            var articleId = item.article_id;
            if (!articleId || seenIds.has(articleId)) {
              continue;
            }
            seenIds.add(articleId);
            var post = extractArticlePost(item);
            if (post) {
              console.log("[Juejin] [搜索] 相关文章: " + post.title);
              posts.push(post);
            }
          }
          found = true;
        } else {
          console.log("[Juejin] search_api '" + keyword + "' 无结果: " + (data1.err_msg || "无数据"));
        }
      } else {
        console.log("[Juejin] search_api HTTP 错误: " + response1.status);
      }
    } catch (error) {
      console.error("[Juejin] search_api 异常: " + (error instanceof Error ? error.message : String(error)));
    }

    if (found) {
      await delay(2000);
      continue;
    }

    await delay(2000);

    // 策略2: content_api/v1/article/query
    try {
      console.log("[Juejin] 搜索关键词 (策略2: content_api): " + keyword);

      var body2 = JSON.stringify({
        keyword: keyword,
        cursor: "0" + "",
        sort_type: 200,
        limit: 20,
      });

      var response2 = await fetch(CONTENT_API, {
        method: "POST",
        headers: buildApiHeaders(0),
        body: body2,
      });

      if (response2.ok) {
        var jsonText2 = await response2.text();
        try {
          var data2 = JSON.parse(jsonText2);
          if (data2.err_no === 0 && data2.data) {
            var list2 = data2.data;
            if (!Array.isArray(list2)) {
              list2 = list2.articles || list2.list || [];
            }
            if (list2.length > 0) {
              console.log("[Juejin] content_api 返回 " + list2.length + " 条");
              for (var j2 = 0; j2 < list2.length; j2++) {
                var item2 = list2[j2];
                var aid2 = item2.article_id;
                if (!aid2 || seenIds.has(aid2)) {
                  continue;
                }
                seenIds.add(aid2);
                var post2 = extractArticlePost(item2);
                if (post2) {
                  console.log("[Juejin] [content_api] 相关文章: " + post2.title);
                  posts.push(post2);
                }
              }
              found = true;
            }
          }
        } catch (parseErr) {
          console.log("[Juejin] content_api JSON 解析失败");
        }
      } else {
        console.log("[Juejin] content_api HTTP 错误: " + response2.status);
      }
    } catch (error) {
      console.error("[Juejin] content_api 异常: " + (error instanceof Error ? error.message : String(error)));
    }

    if (found) {
      await delay(2000);
      continue;
    }

    await delay(2000);

    // 策略3: 不同 User-Agent 重试 search_api
    for (var uaIdx = 1; uaIdx < USER_AGENTS.length && !found; uaIdx++) {
      try {
        console.log("[Juejin] 搜索关键词 (策略3: UA " + uaIdx + "): " + keyword);

        var body3 = JSON.stringify({
          query: keyword,
          sort_type: 200,
          cursor: "0",
          limit: 20,
        });

        var response3 = await fetch(SEARCH_API, {
          method: "POST",
          headers: buildApiHeaders(uaIdx),
          body: body3,
        });

        if (response3.ok) {
          var data3 = (await response3.json()) as SearchResponse;
          if (data3.err_no === 0 && data3.data && data3.data.length > 0) {
            console.log("[Juejin] search_api (UA " + uaIdx + ") 返回 " + data3.data.length + " 条");
            for (var j3 = 0; j3 < data3.data.length; j3++) {
              var item3 = data3.data[j3];
              var aid3 = item3.article_id;
              if (!aid3 || seenIds.has(aid3)) {
                continue;
              }
              seenIds.add(aid3);
              var post3 = extractArticlePost(item3);
              if (post3) {
                posts.push(post3);
              }
            }
            found = true;
          }
        }
      } catch (error) {
        console.error("[Juejin] search_api (UA " + uaIdx + ") 异常: " + (error instanceof Error ? error.message : String(error)));
      }
      await delay(2000);
    }

    // 请求间隔 2000ms
    await delay(2000);
  }

  console.log("[Juejin] 搜索方式获取 " + posts.length + " 篇文章");
  return posts;
}

// ============================================================
// 方式2: 掘金推荐流 API
// POST https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed
// ============================================================

interface FeedItem {
  article_id?: string;
  article_info?: {
    title: string;
    brief_content: string;
    ctime: string;
  };
  author_user_info?: {
    user_name: string;
  };
  item_type?: number;
}

async function crawlViaFeedAPI(): Promise<RawPost[]> {
  console.log("[Juejin] 方式2: 推荐流 API...");
  var posts: RawPost[] = [];
  var seenIds = new Set<string>();

  // 请求多页推荐流，每页20条，最多3页
  var maxPages = 3;
  var cursor = "0";

  for (var page = 0; page < maxPages; page++) {
    try {
      console.log("[Juejin] 推荐流第 " + (page + 1) + " 页, cursor=" + cursor);

      var body = JSON.stringify({
        id_type: 2,
        sort_type: 200,
        cursor: cursor,
        limit: 20,
      });

      var response = await fetch(FEED_API, {
        method: "POST",
        headers: buildApiHeaders(0),
        body: body,
      });

      if (!response.ok) {
        console.error("[Juejin] 推荐流 API HTTP 错误: " + response.status);
        break;
      }

      var jsonText = await response.text();
      var data: any;

      try {
        data = JSON.parse(jsonText);
      } catch (parseErr) {
        console.error("[Juejin] 推荐流 JSON 解析失败");
        break;
      }

      if (data.err_no !== 0) {
        console.error("[Juejin] 推荐流 API 错误: " + (data.err_msg || "未知"));
        break;
      }

      // 推荐流返回结构可能是 data 数组，也可能是 { data: number, articles: [...] }
      var items: FeedItem[] = [];

      if (Array.isArray(data.data)) {
        items = data.data;
      } else if (data.data && Array.isArray(data.data.articles)) {
        items = data.data.articles;
      } else if (Array.isArray(data.articles)) {
        items = data.articles;
      }

      if (items.length === 0) {
        console.log("[Juejin] 推荐流无更多数据");
        break;
      }

      console.log("[Juejin] 推荐流返回 " + items.length + " 条");

      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        var articleId = item.article_id;

        if (!articleId || seenIds.has(articleId)) {
          continue;
        }
        seenIds.add(articleId);

        var title = "";
        var content = "";
        var author = "";
        var ctime = "";

        if (item.article_info) {
          title = item.article_info.title || "";
          content = item.article_info.brief_content || "";
          ctime = item.article_info.ctime || "";
        }

        if (item.author_user_info) {
          author = item.author_user_info.user_name || "";
        }

        if (!title) {
          continue;
        }

        // 按搜索关键词过滤
        var combinedText = (title + " " + content).toLowerCase();
        var hasSearchKeyword = false;
        for (var si = 0; si < SEARCH_KEYWORDS.length; si++) {
          if (combinedText.indexOf(SEARCH_KEYWORDS[si].toLowerCase()) !== -1) {
            hasSearchKeyword = true;
            break;
          }
        }

        if (!hasSearchKeyword) {
          continue;
        }

        // 内容预过滤
        if (!passesContentFilter(title, content)) {
          continue;
        }

        console.log("[Juejin] [推荐流] 相关文章: " + title);

        var publishedAt = "";
        if (ctime) {
          var ts = parseInt(ctime, 10);
          if (!isNaN(ts)) {
            publishedAt = new Date(ts * 1000).toISOString();
          }
        }
        if (!publishedAt) {
          publishedAt = new Date().toISOString();
        }

        posts.push({
          url: "https://juejin.cn/post/" + articleId,
          platform: "juejin",
          title: title,
          content: content,
          author: author || "unknown",
          publishedAt: publishedAt,
          fetchedAt: new Date().toISOString(),
        });
      }

      // 更新 cursor
      if (typeof data.data === "number" || typeof data.cursor === "string") {
        cursor = String(data.data || data.cursor || "0");
      } else if (!data.has_more) {
        console.log("[Juejin] 推荐流无更多数据 (has_more=false)");
        break;
      }

      // 请求间隔 2000ms
      await delay(2000);
    } catch (error) {
      console.error(
        "[Juejin] 推荐流第 " +
          (page + 1) +
          " 页异常: " +
          (error instanceof Error ? error.message : String(error))
      );
      break;
    }
  }

  console.log("[Juejin] 推荐流方式获取 " + posts.length + " 篇文章");
  return posts;
}

// ============================================================
// 方式3: 掘金搜索页面 HTML 解析（备用方式）
// ============================================================
async function crawlViaSearchHtml(): Promise<RawPost[]> {
  console.log("[Juejin] 方式3: 搜索页面 HTML 解析...");
  var posts: RawPost[] = [];
  var seenIds = new Set<string>();
  var keywords = SEARCH_KEYWORDS.slice(0, 3);

  for (var ki = 0; ki < keywords.length; ki++) {
    var keyword = keywords[ki];
    var searchUrl = "https://juejin.cn/search?query=" + encodeURIComponent(keyword) + "&sort_type=200";

    for (var uaIdx = 0; uaIdx < USER_AGENTS.length; uaIdx++) {
      try {
        console.log("[Juejin] HTML 搜索 '" + keyword + "' (UA " + uaIdx + ")");
        var response = await fetch(searchUrl, {
          headers: buildHtmlHeaders(uaIdx),
        });

        if (!response.ok) {
          console.log("[Juejin] HTML 搜索 HTTP 错误: " + response.status);
          continue;
        }

        var html = await response.text();
        var parsed = parseSearchPageHtml(html);

        if (parsed.length > 0) {
          console.log("[Juejin] HTML 搜索解析到 " + parsed.length + " 条");
          for (var pi = 0; pi < parsed.length; pi++) {
            var item = parsed[pi];
            if (seenIds.has(item.articleId)) {
              continue;
            }
            seenIds.add(item.articleId);

            if (!passesContentFilter(item.title, item.content)) {
              continue;
            }

            console.log("[Juejin] [HTML搜索] 相关文章: " + item.title);
            posts.push({
              url: "https://juejin.cn/post/" + item.articleId,
              platform: "juejin",
              title: item.title,
              content: item.content,
              author: item.author || "unknown",
              publishedAt: new Date().toISOString(),
              fetchedAt: new Date().toISOString(),
            });
          }
          break; // 成功获取就不再尝试其他 UA
        }
      } catch (error) {
        console.log("[Juejin] HTML 搜索异常 (UA " + uaIdx + "): " + (error instanceof Error ? error.message : String(error)));
      }
      await delay(2000);
    }

    await delay(2000);
  }

  console.log("[Juejin] HTML 搜索方式获取 " + posts.length + " 篇文章");
  return posts;
}

// 解析掘金搜索页面 HTML
interface ParsedArticle {
  articleId: string;
  title: string;
  content: string;
  author: string;
}

function parseSearchPageHtml(html: string): ParsedArticle[] {
  var results: ParsedArticle[] = [];
  var $ = cheerio.load(html);

  // 掘金搜索结果通常在 .entry-item 或 .search-result-container 中
  // 尝试多种选择器
  var selectors = [
    ".entry-item",
    ".search-result-container .entry",
    ".content-box .entry",
    "article",
    "[class*='entry']",
    "[class*='article']",
    "a[href*='/post/']",
  ];

  for (var si = 0; si < selectors.length; si++) {
    var $items = $(selectors[si]);
    if ($items.length === 0) {
      continue;
    }

    $items.each(function (_, element) {
      var $el = $(element);

      // 提取文章链接
      var $link = $el.find("a[href*='/post/']").first();
      if ($link.length === 0 && $el.attr("href") && $el.attr("href")!.indexOf("/post/") !== -1) {
        $link = $el;
      }

      var href = $link.attr("href") || "";
      var title = $link.text().trim() || $el.find(".title, .entry-title, h1, h2, h3").first().text().trim();

      if (!title || title.length < 4) {
        return;
      }

      // 提取 article_id
      var articleId = "";
      var match = href.match(/\/post\/(\d+)/);
      if (match) {
        articleId = match[1];
      }
      if (!articleId) {
        return;
      }

      // 提取摘要
      var content = $el.find(".abstract, .desc, .summary, .entry-desc, .content").first().text().trim();

      // 提取作者
      var author = $el.find(".author, .username, .name").first().text().trim();

      results.push({
        articleId: articleId,
        title: title,
        content: content,
        author: author,
      });
    });

    if (results.length > 0) {
      break;
    }
  }

  // 去重
  var seen = new Set<string>();
  var unique: ParsedArticle[] = [];
  for (var i = 0; i < results.length; i++) {
    if (!seen.has(results[i].articleId)) {
      seen.add(results[i].articleId);
      unique.push(results[i]);
    }
  }

  return unique;
}

// ============================================================
// 主入口：依次尝试三种方式，合并去重
// ============================================================

export async function crawlJuejin(): Promise<RawPost[]> {
  console.log("[Juejin] 开始爬取掘金...");

  var allPosts: RawPost[] = [];

  // 方式1: 搜索 API（主要方式，精准匹配关键词）
  try {
    var searchPosts = await crawlViaSearchAPI();
    allPosts = allPosts.concat(searchPosts);
  } catch (err) {
    console.error(
      "[Juejin] 搜索方式失败: " +
        (err instanceof Error ? err.message : String(err))
    );
  }

  await delay(2000);

  // 方式2: 推荐流 API（补充方式，从推荐流中过滤关键词）
  try {
    var feedPosts = await crawlViaFeedAPI();
    allPosts = allPosts.concat(feedPosts);
  } catch (err) {
    console.error(
      "[Juejin] 推荐流方式失败: " +
        (err instanceof Error ? err.message : String(err))
    );
  }

  await delay(2000);

  // 方式3: HTML 搜索页面解析（最后备用）
  if (allPosts.length < 5) {
    console.log("[Juejin] 前两种方式结果较少，尝试 HTML 搜索页面...");
    try {
      var htmlPosts = await crawlViaSearchHtml();
      allPosts = allPosts.concat(htmlPosts);
    } catch (err) {
      console.error(
        "[Juejin] HTML 搜索方式失败: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  // 去重
  var uniquePosts = dedupPosts(allPosts);

  console.log("[Juejin] 爬取完成，共获取 " + uniquePosts.length + " 篇文章");
  return uniquePosts;
}
