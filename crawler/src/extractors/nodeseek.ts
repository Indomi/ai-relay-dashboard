import { RawPost } from "../types";
import * as cheerio from "cheerio";

const BASE_URL = "https://www.nodeseek.com";

// 搜索关键词
const SEARCH_KEYWORDS = [
  "API中转",
  "OpenAI",
  "GPT",
  "Claude",
  "中转站",
  "API代理",
  "AI API",
  "key",
];

// 内容预过滤关键词（命中任一则保留）
const CONTENT_FILTER_KEYWORDS = [
  "中转",
  "api",
  "openai",
  "claude",
  "gpt",
  "token",
  "proxy",
  "充值",
  "额度",
];

// 多种 User-Agent 备选
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
];

// 基础请求头
function buildBaseHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: BASE_URL,
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
  };
}

// JSON 请求头
function buildJsonHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: BASE_URL,
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
  };
}

// 带浏览器 cookie 的请求头
function buildCookieHeaders(uaIndex: number, cookies: string): { [key: string]: string } {
  var headers = buildBaseHeaders(uaIndex);
  headers["Cookie"] = cookies;
  return headers;
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// 内容预过滤：标题或描述中是否包含目标关键词
function passesContentFilter(title: string, description: string): boolean {
  var combined = (title + " " + description).toLowerCase();
  for (var i = 0; i < CONTENT_FILTER_KEYWORDS.length; i++) {
    if (combined.indexOf(CONTENT_FILTER_KEYWORDS[i]) !== -1) {
      return true;
    }
  }
  return false;
}

// 去重：避免重复抓取同一帖子
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

// 尝试访问首页获取 cookies
async function fetchHomepageCookies(): Promise<string> {
  console.log("[NodeSeek] 尝试访问首页获取 cookies...");
  for (var uaIdx = 0; uaIdx < USER_AGENTS.length; uaIdx++) {
    try {
      var headers = buildBaseHeaders(uaIdx);
      var resp = await fetch(BASE_URL, {
        headers: headers,
        redirect: "follow",
      });
      if (resp.ok) {
        var setCookieHeader = resp.headers.get("set-cookie") || "";
        if (setCookieHeader) {
          // 提取所有 cookie 名称和值
          var cookies: string[] = [];
          var parts = setCookieHeader.split(",");
          for (var p = 0; p < parts.length; p++) {
            var part = parts[p].trim();
            var eqIdx = part.indexOf("=");
            if (eqIdx > 0) {
              var semiIdx = part.indexOf(";");
              if (semiIdx === -1) semiIdx = part.length;
              cookies.push(part.substring(0, semiIdx));
            }
          }
          var cookieStr = cookies.join("; ");
          console.log("[NodeSeek] 从首页获取到 cookies: " + cookieStr.substring(0, 80) + "...");
          return cookieStr;
        }
      }
      await delay(1000);
    } catch (err) {
      console.log("[NodeSeek] 首页请求异常 (UA " + uaIdx + "): " + (err instanceof Error ? err.message : String(err)));
    }
  }
  console.log("[NodeSeek] 未能从首页获取 cookies");
  return "";
}

// ============================================================
// 方式1: RSS 订阅源（多种策略）
// ============================================================
interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
}

function parseRSSXML(xml: string): RSSItem[] {
  var $ = cheerio.load(xml, { xmlMode: true });
  var items: RSSItem[] = [];

  $("item").each(function (_, element) {
    var $el = $(element);
    var title = $el.find("title").text().trim();
    var link = $el.find("link").text().trim();
    var description = $el.find("description").text().trim();
    var pubDate = $el.find("pubDate").text().trim();
    var author =
      $el.find("author").text().trim() ||
      $el.find("dc\\:creator").text().trim() ||
      "unknown";

    items.push({
      title: title,
      link: link,
      description: description,
      pubDate: pubDate,
      author: author,
    });
  });

  return items;
}

async function crawlViaRSS(cookies: string): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式1: 尝试 RSS 订阅源...");
  var posts: RawPost[] = [];
  var rssUrls = [BASE_URL + "/rss.xml", BASE_URL + "/feed"];

  for (var u = 0; u < rssUrls.length; u++) {
    var rssUrl = rssUrls[u];

    // 策略1: 带 Accept: application/rss+xml
    try {
      console.log("[NodeSeek] RSS 策略1: Accept: application/rss+xml -> " + rssUrl);
      var headers1 = buildBaseHeaders(0);
      headers1["Accept"] = "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8";
      if (cookies) {
        headers1["Cookie"] = cookies;
      }
      var resp1 = await fetch(rssUrl, { headers: headers1 });
      if (resp1.ok) {
        var xml1 = await resp1.text();
        var items1 = parseRSSXML(xml1);
        console.log("[NodeSeek] RSS 策略1 解析到 " + items1.length + " 条");
        if (items1.length > 0) {
          posts = await processRSSItems(items1, posts);
          return posts;
        }
      } else {
        console.log("[NodeSeek] RSS 策略1 请求失败: " + resp1.status);
      }
    } catch (err) {
      console.log("[NodeSeek] RSS 策略1 异常: " + (err instanceof Error ? err.message : String(err)));
    }

    await delay(2000);

    // 策略2: 不同 User-Agent + cookie
    for (var uaIdx = 1; uaIdx < USER_AGENTS.length; uaIdx++) {
      try {
        console.log("[NodeSeek] RSS 策略2: UA " + uaIdx + " + cookies -> " + rssUrl);
        var headers2 = buildBaseHeaders(uaIdx);
        headers2["Accept"] = "application/rss+xml, application/xml, text/xml;q=0.9";
        if (cookies) {
          headers2["Cookie"] = cookies;
        }
        var resp2 = await fetch(rssUrl, { headers: headers2 });
        if (resp2.ok) {
          var xml2 = await resp2.text();
          var items2 = parseRSSXML(xml2);
          console.log("[NodeSeek] RSS 策略2 (UA " + uaIdx + ") 解析到 " + items2.length + " 条");
          if (items2.length > 0) {
            posts = await processRSSItems(items2, posts);
            return posts;
          }
        }
      } catch (err) {
        console.log("[NodeSeek] RSS 策略2 (UA " + uaIdx + ") 异常: " + (err instanceof Error ? err.message : String(err)));
      }
      await delay(2000);
    }

    await delay(2000);
  }

  console.log("[NodeSeek] RSS 方式获取 " + posts.length + " 篇帖子");
  return posts;
}

async function processRSSItems(items: RSSItem[], posts: RawPost[]): Promise<RawPost[]> {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];

    if (!item.link) {
      continue;
    }

    // 如果 link 是相对路径，补全
    if (item.link.indexOf("http") !== 0) {
      item.link = BASE_URL + item.link;
    }

    // 内容预过滤
    if (!passesContentFilter(item.title, item.description)) {
      continue;
    }

    // 抓取帖子详情
    var post = await fetchPostDetail(item.link);
    if (post) {
      // 如果 RSS 有发布时间，使用它
      if (item.pubDate) {
        post.publishedAt = item.pubDate;
      }
      if (item.author && item.author !== "unknown") {
        post.author = item.author;
      }
      posts.push(post);
    }

    await delay(2000);
  }
  return posts;
}

// ============================================================
// 方式2: 搜索页面 HTML 抓取（多种策略）
// ============================================================
interface SearchResult {
  title: string;
  url: string;
  description: string;
}

async function crawlViaSearch(cookies: string): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式2: 尝试搜索页面抓取...");
  var posts: RawPost[] = [];
  var keywords = SEARCH_KEYWORDS.slice(0, 3);

  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];
    var searchUrl =
      BASE_URL +
      "/posts?keyword=" +
      encodeURIComponent(keyword) +
      "&page=1";
    console.log("[NodeSeek] 搜索关键词: " + keyword + " -> " + searchUrl);

    var found = false;

    // 策略1: 标准 headers + X-Requested-With
    try {
      console.log("[NodeSeek] 搜索策略1: 标准 headers + X-Requested-With");
      var headers1 = buildBaseHeaders(0);
      headers1["X-Requested-With"] = "XMLHttpRequest";
      if (cookies) {
        headers1["Cookie"] = cookies;
      }
      var resp1 = await fetch(searchUrl, { headers: headers1 });
      if (resp1.ok) {
        var html1 = await resp1.text();
        var results1 = parseSearchHTML(html1);
        console.log("[NodeSeek] 搜索策略1 解析到 " + results1.length + " 条结果");
        if (results1.length > 0) {
          posts = await processSearchResults(results1, posts);
          found = true;
        }
      } else {
        console.log("[NodeSeek] 搜索策略1 请求失败: " + resp1.status);
      }
    } catch (err) {
      console.log("[NodeSeek] 搜索策略1 异常: " + (err instanceof Error ? err.message : String(err)));
    }

    if (found) {
      await delay(2000);
      continue;
    }

    await delay(2000);

    // 策略2: 不同 User-Agent + cookie
    for (var uaIdx = 1; uaIdx < USER_AGENTS.length && !found; uaIdx++) {
      try {
        console.log("[NodeSeek] 搜索策略2: UA " + uaIdx + " + cookies");
        var headers2 = buildBaseHeaders(uaIdx);
        if (cookies) {
          headers2["Cookie"] = cookies;
        }
        var resp2 = await fetch(searchUrl, { headers: headers2 });
        if (resp2.ok) {
          var html2 = await resp2.text();
          var results2 = parseSearchHTML(html2);
          console.log("[NodeSeek] 搜索策略2 (UA " + uaIdx + ") 解析到 " + results2.length + " 条结果");
          if (results2.length > 0) {
            posts = await processSearchResults(results2, posts);
            found = true;
          }
        }
      } catch (err) {
        console.log("[NodeSeek] 搜索策略2 (UA " + uaIdx + ") 异常: " + (err instanceof Error ? err.message : String(err)));
      }
      await delay(2000);
    }

    if (found) {
      await delay(2000);
      continue;
    }

    await delay(2000);

    // 策略3: Google 缓存
    try {
      console.log("[NodeSeek] 搜索策略3: Google 缓存");
      var cacheUrl = "https://webcache.googleusercontent.com/search?q=cache:nodeseek.com/posts?keyword=" + encodeURIComponent(keyword);
      var headers3 = buildBaseHeaders(0);
      headers3["Referer"] = "https://www.google.com/";
      var resp3 = await fetch(cacheUrl, { headers: headers3 });
      if (resp3.ok) {
        var html3 = await resp3.text();
        var results3 = parseSearchHTML(html3);
        console.log("[NodeSeek] Google 缓存解析到 " + results3.length + " 条结果");
        if (results3.length > 0) {
          posts = await processSearchResults(results3, posts);
          found = true;
        }
      } else {
        console.log("[NodeSeek] Google 缓存请求失败: " + resp3.status);
      }
    } catch (err) {
      console.log("[NodeSeek] Google 缓存异常: " + (err instanceof Error ? err.message : String(err)));
    }

    await delay(3000);
  }

  console.log("[NodeSeek] 搜索方式获取 " + posts.length + " 篇帖子");
  return posts;
}

async function processSearchResults(results: SearchResult[], posts: RawPost[]): Promise<RawPost[]> {
  var limit = Math.min(results.length, 5);
  for (var i = 0; i < limit; i++) {
    var result = results[i];

    // 内容预过滤
    if (!passesContentFilter(result.title, result.description)) {
      continue;
    }

    var post = await fetchPostDetail(result.url);
    if (post) {
      posts.push(post);
    }

    await delay(2000);
  }
  return posts;
}

// 解析搜索结果 HTML，提取帖子链接
function parseSearchHTML(html: string): SearchResult[] {
  var results: SearchResult[] = [];
  var $ = cheerio.load(html);

  // NodeSeek 搜索结果页的帖子列表项
  $("a[href*='/post-']").each(function (_, element) {
    var $el = $(element);
    var href = $el.attr("href") || "";
    var title = $el.text().trim();

    if (!href || !title) {
      return;
    }

    // 补全 URL
    var fullUrl = href;
    if (href.indexOf("http") !== 0) {
      fullUrl = BASE_URL + href;
    }

    // 尝试获取父元素中的描述文本
    var $parent = $el.closest(".topic-item, .post-item, .item, li, tr, div");
    var description = "";
    if ($parent.length > 0) {
      description = $parent.find(".desc, .summary, .content, .text").text().trim();
    }

    results.push({
      title: title,
      url: fullUrl,
      description: description,
    });
  });

  // 如果上面的选择器没有匹配到，尝试更宽泛的方式
  if (results.length === 0) {
    $("a").each(function (_, element) {
      var $el = $(element);
      var href = $el.attr("href") || "";
      if (href.indexOf("/post-") === -1) {
        return;
      }
      var title = $el.text().trim();
      if (!title || title.length < 4) {
        return;
      }
      var fullUrl = BASE_URL + href;
      results.push({
        title: title,
        url: fullUrl,
        description: "",
      });
    });
  }

  // 去重
  var seen = new Set<string>();
  var unique: SearchResult[] = [];
  for (var i = 0; i < results.length; i++) {
    if (!seen.has(results[i].url)) {
      seen.add(results[i].url);
      unique.push(results[i]);
    }
  }

  return unique;
}

// ============================================================
// 方式3: API 接口（如果存在）
// ============================================================
async function crawlViaAPI(cookies: string): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式3: 尝试 API 接口...");
  var posts: RawPost[] = [];
  var keywords = SEARCH_KEYWORDS.slice(0, 3);

  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];
    var apiUrl =
      BASE_URL +
      "/api/posts?keyword=" +
      encodeURIComponent(keyword) +
      "&page=1";
    console.log("[NodeSeek] API 关键词: " + keyword);

    // 策略1: JSON headers + X-Requested-With + cookie
    try {
      console.log("[NodeSeek] API 策略1: JSON headers + X-Requested-With + cookies");
      var headers1 = buildJsonHeaders(0);
      if (cookies) {
        headers1["Cookie"] = cookies;
      }
      var resp1 = await fetch(apiUrl, { headers: headers1 });

      if (resp1.ok) {
        var data1 = await resp1.json();
        var list1 =
          (data1 && data1.data && data1.data.list) ||
          (data1 && data1.result && data1.result.list) ||
          (data1 && data1.data) ||
          [];

        if (Array.isArray(list1) && list1.length > 0) {
          console.log("[NodeSeek] API 策略1 返回 " + list1.length + " 条");
          posts = await processAPIResults(list1, posts);
          await delay(3000);
          continue;
        }
      } else {
        console.log("[NodeSeek] API 策略1 请求失败: " + resp1.status);
      }
    } catch (err) {
      console.log("[NodeSeek] API 策略1 异常: " + (err instanceof Error ? err.message : String(err)));
    }

    await delay(2000);

    // 策略2: 不同 User-Agent
    for (var uaIdx = 1; uaIdx < USER_AGENTS.length; uaIdx++) {
      try {
        console.log("[NodeSeek] API 策略2: UA " + uaIdx);
        var headers2 = buildJsonHeaders(uaIdx);
        if (cookies) {
          headers2["Cookie"] = cookies;
        }
        var resp2 = await fetch(apiUrl, { headers: headers2 });

        if (resp2.ok) {
          var data2 = await resp2.json();
          var list2 =
            (data2 && data2.data && data2.data.list) ||
            (data2 && data2.result && data2.result.list) ||
            (data2 && data2.data) ||
            [];

          if (Array.isArray(list2) && list2.length > 0) {
            console.log("[NodeSeek] API 策略2 (UA " + uaIdx + ") 返回 " + list2.length + " 条");
            posts = await processAPIResults(list2, posts);
            break;
          }
        }
      } catch (err) {
        console.log("[NodeSeek] API 策略2 (UA " + uaIdx + ") 异常: " + (err instanceof Error ? err.message : String(err)));
      }
      await delay(2000);
    }

    await delay(3000);
  }

  console.log("[NodeSeek] API 方式获取 " + posts.length + " 篇帖子");
  return posts;
}

async function processAPIResults(list: any[], posts: RawPost[]): Promise<RawPost[]> {
  var limit = Math.min(list.length, 5);
  for (var i = 0; i < limit; i++) {
    var item = list[i];
    var postId = item.id || item._id || item.post_id;
    if (!postId) {
      continue;
    }

    var postUrl = BASE_URL + "/post-" + postId;
    var title = item.title || item.name || "";

    // 内容预过滤
    var desc = item.description || item.content || item.excerpt || "";
    if (!passesContentFilter(title, desc)) {
      continue;
    }

    var post = await fetchPostDetail(postUrl);
    if (post) {
      posts.push(post);
    }

    await delay(2000);
  }
  return posts;
}

// ============================================================
// 帖子详情抓取（多种策略）
// ============================================================
async function fetchPostDetail(url: string): Promise<RawPost | null> {
  // 策略1: 标准请求
  try {
    console.log("[NodeSeek] 抓取帖子详情 (策略1): " + url);
    var headers1 = buildBaseHeaders(0);
    var resp1 = await fetch(url, { headers: headers1 });

    if (resp1.ok) {
      return parsePostDetail(url, await resp1.text());
    } else {
      console.log("[NodeSeek] 帖子详情策略1 失败: " + resp1.status);
    }
  } catch (err) {
    console.log("[NodeSeek] 帖子详情策略1 异常: " + (err instanceof Error ? err.message : String(err)));
  }

  await delay(2000);

  // 策略2: 不同 User-Agent
  for (var uaIdx = 1; uaIdx < USER_AGENTS.length; uaIdx++) {
    try {
      console.log("[NodeSeek] 抓取帖子详情 (策略2, UA " + uaIdx + "): " + url);
      var headers2 = buildBaseHeaders(uaIdx);
      var resp2 = await fetch(url, { headers: headers2 });

      if (resp2.ok) {
        return parsePostDetail(url, await resp2.text());
      }
    } catch (err) {
      console.log("[NodeSeek] 帖子详情策略2 (UA " + uaIdx + ") 异常: " + (err instanceof Error ? err.message : String(err)));
    }
    await delay(2000);
  }

  return null;
}

function parsePostDetail(url: string, html: string): RawPost | null {
  var $ = cheerio.load(html);

  // 提取标题
  var title = "";
  var $title = $("h1").first();
  if ($title.length > 0) {
    title = $title.text().trim();
  }
  if (!title) {
    title = $("title").text().trim();
  }

  // 提取正文内容
  var content = "";
  var $content = $(".post-content, .topic-content, .content, article .content").first();
  if ($content.length > 0) {
    content = $content.text().trim();
  }
  if (!content) {
    var $main = $("main, .main, .post-body, .topic-body").first();
    if ($main.length > 0) {
      content = $main.text().trim();
    }
  }

  // 提取作者
  var author = "";
  var $author = $(".username, .author, .user-name, .nickname").first();
  if ($author.length > 0) {
    author = $author.text().trim();
  }

  // 提取发布时间
  var publishedAt = "";
  var $time = $(".post-time, .date, time, .publish-time").first();
  if ($time.length > 0) {
    var datetime = $time.attr("datetime") || $time.text().trim();
    if (datetime) {
      publishedAt = new Date(datetime).toISOString();
    }
  }
  if (!publishedAt) {
    publishedAt = new Date().toISOString();
  }

  if (!title || !content) {
    console.log("[NodeSeek] 帖子缺少标题或内容，跳过: " + url);
    return null;
  }

  return {
    url: url,
    platform: "nodeseek",
    title: title,
    content: content,
    author: author || "unknown",
    publishedAt: publishedAt,
    fetchedAt: new Date().toISOString(),
  };
}

// ============================================================
// 主入口：先获取 cookies，再依次尝试三种方式，合并去重
// ============================================================
export async function crawlNodeSeek(): Promise<RawPost[]> {
  console.log("[NodeSeek] 开始爬取 NodeSeek...");
  var allPosts: RawPost[] = [];

  // 预先获取 cookies（最后手段的准备工作）
  var cookies = await fetchHomepageCookies();

  // 方式1: RSS
  try {
    var rssPosts = await crawlViaRSS(cookies);
    allPosts = allPosts.concat(rssPosts);
  } catch (err) {
    console.log("[NodeSeek] RSS 方式失败，继续尝试其他方式");
  }

  await delay(2000);

  // 方式2: 搜索页面
  try {
    var searchPosts = await crawlViaSearch(cookies);
    allPosts = allPosts.concat(searchPosts);
  } catch (err) {
    console.log("[NodeSeek] 搜索方式失败，继续尝试其他方式");
  }

  await delay(2000);

  // 方式3: API
  try {
    var apiPosts = await crawlViaAPI(cookies);
    allPosts = allPosts.concat(apiPosts);
  } catch (err) {
    console.log("[NodeSeek] API 方式失败");
  }

  // 去重
  var uniquePosts = dedupPosts(allPosts);

  console.log("[NodeSeek] 爬取完成，共获取 " + uniquePosts.length + " 篇帖子");
  return uniquePosts;
}
