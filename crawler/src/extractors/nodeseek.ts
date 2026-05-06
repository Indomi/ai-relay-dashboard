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

// 请求头
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: BASE_URL,
};

const JSON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: BASE_URL,
};

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

// ============================================================
// 方式1: RSS 订阅源
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

async function crawlViaRSS(): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式1: 尝试 RSS 订阅源...");
  var posts: RawPost[] = [];
  var rssUrls = [BASE_URL + "/rss.xml", BASE_URL + "/feed"];

  for (var u = 0; u < rssUrls.length; u++) {
    var rssUrl = rssUrls[u];
    try {
      console.log("[NodeSeek] RSS URL: " + rssUrl);
      var resp = await fetch(rssUrl, { headers: HEADERS });

      if (!resp.ok) {
        console.log("[NodeSeek] RSS 请求失败: " + resp.status);
        continue;
      }

      var xml = await resp.text();
      var items = parseRSSXML(xml);
      console.log("[NodeSeek] RSS 解析到 " + items.length + " 条");

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

      // 找到有效 RSS 就不再尝试其他 URL
      if (items.length > 0) {
        break;
      }
    } catch (err) {
      console.log("[NodeSeek] RSS 抓取异常: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  console.log("[NodeSeek] RSS 方式获取 " + posts.length + " 篇帖子");
  return posts;
}

// ============================================================
// 方式2: 搜索页面 HTML 抓取
// ============================================================
interface SearchResult {
  title: string;
  url: string;
  description: string;
}

async function crawlViaSearch(): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式2: 尝试搜索页面抓取...");
  var posts: RawPost[] = [];
  // 只使用前3个关键词，避免请求过多
  var keywords = SEARCH_KEYWORDS.slice(0, 3);

  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];
    try {
      var searchUrl =
        BASE_URL +
        "/posts?keyword=" +
        encodeURIComponent(keyword) +
        "&page=1";
      console.log("[NodeSeek] 搜索关键词: " + keyword + " -> " + searchUrl);

      var resp = await fetch(searchUrl, { headers: HEADERS });

      if (!resp.ok) {
        console.log("[NodeSeek] 搜索请求失败: " + resp.status);
        continue;
      }

      var html = await resp.text();
      var results = parseSearchHTML(html);
      console.log(
        "[NodeSeek] 关键词 '" + keyword + "' 解析到 " + results.length + " 条结果"
      );

      // 最多取前5条
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

      await delay(3000);
    } catch (err) {
      console.log(
        "[NodeSeek] 搜索关键词 '" +
          keyword +
          "' 异常: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  console.log("[NodeSeek] 搜索方式获取 " + posts.length + " 篇帖子");
  return posts;
}

// 解析搜索结果 HTML，提取帖子链接
function parseSearchHTML(html: string): SearchResult[] {
  var results: SearchResult[] = [];
  var $ = cheerio.load(html);

  // NodeSeek 搜索结果页的帖子列表项
  // 帖子链接通常在 <a> 标签中，href 格式为 /post-XXXXX
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
async function crawlViaAPI(): Promise<RawPost[]> {
  console.log("[NodeSeek] 方式3: 尝试 API 接口...");
  var posts: RawPost[] = [];
  var keywords = SEARCH_KEYWORDS.slice(0, 3);

  for (var k = 0; k < keywords.length; k++) {
    var keyword = keywords[k];
    try {
      var apiUrl =
        BASE_URL +
        "/api/posts?keyword=" +
        encodeURIComponent(keyword) +
        "&page=1";
      console.log("[NodeSeek] API 关键词: " + keyword);

      var resp = await fetch(apiUrl, { headers: JSON_HEADERS });

      if (!resp.ok) {
        console.log("[NodeSeek] API 请求失败: " + resp.status);
        continue;
      }

      var data = await resp.json();
      var list =
        (data && data.data && data.data.list) ||
        (data && data.result && data.result.list) ||
        (data && data.data) ||
        [];

      if (!Array.isArray(list)) {
        console.log("[NodeSeek] API 返回数据格式非数组，跳过");
        continue;
      }

      console.log("[NodeSeek] API 返回 " + list.length + " 条");

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

      await delay(3000);
    } catch (err) {
      console.log(
        "[NodeSeek] API 关键词 '" +
          keyword +
          "' 异常: " +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  console.log("[NodeSeek] API 方式获取 " + posts.length + " 篇帖子");
  return posts;
}

// ============================================================
// 帖子详情抓取
// ============================================================
async function fetchPostDetail(url: string): Promise<RawPost | null> {
  try {
    console.log("[NodeSeek] 抓取帖子详情: " + url);

    var resp = await fetch(url, { headers: HEADERS });

    if (!resp.ok) {
      console.log("[NodeSeek] 帖子详情请求失败: " + resp.status);
      return null;
    }

    var html = await resp.text();
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
    // NodeSeek 帖子内容通常在特定 class 的 div 中
    var $content = $(".post-content, .topic-content, .content, article .content")
      .first();
    if ($content.length > 0) {
      content = $content.text().trim();
    }
    // 备用：尝试更宽泛的选择器
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
  } catch (err) {
    console.log(
      "[NodeSeek] 帖子详情抓取异常: " +
        (err instanceof Error ? err.message : String(err))
    );
    return null;
  }
}

// ============================================================
// 主入口：依次尝试三种方式，合并去重
// ============================================================
export async function crawlNodeSeek(): Promise<RawPost[]> {
  console.log("[NodeSeek] 开始爬取 NodeSeek...");
  var allPosts: RawPost[] = [];

  // 方式1: RSS
  try {
    var rssPosts = await crawlViaRSS();
    allPosts = allPosts.concat(rssPosts);
  } catch (err) {
    console.log("[NodeSeek] RSS 方式失败，继续尝试其他方式");
  }

  await delay(2000);

  // 方式2: 搜索页面
  try {
    var searchPosts = await crawlViaSearch();
    allPosts = allPosts.concat(searchPosts);
  } catch (err) {
    console.log("[NodeSeek] 搜索方式失败，继续尝试其他方式");
  }

  await delay(2000);

  // 方式3: API
  try {
    var apiPosts = await crawlViaAPI();
    allPosts = allPosts.concat(apiPosts);
  } catch (err) {
    console.log("[NodeSeek] API 方式失败");
  }

  // 去重
  var uniquePosts = dedupPosts(allPosts);

  console.log("[NodeSeek] 爬取完成，共获取 " + uniquePosts.length + " 篇帖子");
  return uniquePosts;
}
