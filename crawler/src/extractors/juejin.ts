import { RawPost } from "../types";

// ============================================================
// 掘金 (Juejin) 爬虫 - 真实 API 调用
// ============================================================

// 掘金 API 端点
var SEARCH_API = "https://api.juejin.cn/search_api/v1/search";
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

// 请求头
var HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Referer: "https://juejin.cn/",
  Origin: "https://juejin.cn",
};

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

// ============================================================
// 方式1: 掘金搜索 API
// POST https://api.juejin.cn/search_api/v1/search
// Body: {"query":"KEYWORD","sort_type":200,"cursor":"0","limit":20}
// Response: data.data 数组
// ============================================================

interface SearchArticleItem {
  article_id: string;
  title?: string;
  brief_content?: string;
  author_user_info?: {
    user_name: string;
  };
  article_info?: {
    title: string;
    brief_content: string;
    ctime: string;
  };
}

interface SearchResponse {
  err_no: number;
  err_msg?: string;
  data?: SearchArticleItem[];
}

async function crawlViaSearchAPI(): Promise<RawPost[]> {
  console.log("[Juejin] 方式1: 搜索 API...");
  var posts: RawPost[] = [];
  var seenIds = new Set<string>();

  for (var i = 0; i < SEARCH_KEYWORDS.length; i++) {
    var keyword = SEARCH_KEYWORDS[i];

    try {
      console.log("[Juejin] 搜索关键词: " + keyword);

      var body = JSON.stringify({
        query: keyword,
        sort_type: 200,
        cursor: "0",
        limit: 20,
      });

      var response = await fetch(SEARCH_API, {
        method: "POST",
        headers: HEADERS,
        body: body,
      });

      if (!response.ok) {
        console.error(
          "[Juejin] 搜索 API HTTP 错误: " + response.status
        );
        continue;
      }

      var data = (await response.json()) as SearchResponse;

      if (data.err_no !== 0 || !data.data || data.data.length === 0) {
        console.log(
          "[Juejin] 搜索 '" +
            keyword +
            "' 无结果或出错: " +
            (data.err_msg || "无数据")
        );
        await delay(2000);
        continue;
      }

      console.log(
        "[Juejin] 搜索 '" + keyword + "' 返回 " + data.data.length + " 条"
      );

      for (var j = 0; j < data.data.length; j++) {
        var item = data.data[j];
        var articleId = item.article_id;

        if (!articleId || seenIds.has(articleId)) {
          continue;
        }
        seenIds.add(articleId);

        // 提取标题和内容（兼容两种字段结构）
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
          continue;
        }

        // 内容预过滤
        if (!passesContentFilter(title, content)) {
          continue;
        }

        console.log("[Juejin] [搜索] 相关文章: " + title);

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

      // 请求间隔 2000ms
      await delay(2000);
    } catch (error) {
      console.error(
        "[Juejin] 搜索关键词 '" +
          keyword +
          "' 异常: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  console.log("[Juejin] 搜索方式获取 " + posts.length + " 篇文章");
  return posts;
}

// ============================================================
// 方式2: 掘金推荐流 API
// POST https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed
// Body: {"id_type":2,"sort_type":200,"cursor":"0","limit":20}
// 然后按关键词过滤结果
// ============================================================

interface FeedArticle {
  article_id: string;
  article_info?: {
    title: string;
    brief_content: string;
    ctime: string;
    view_count: number;
    digg_count: number;
  };
  author_user_info?: {
    user_name: string;
  };
  // 推荐流可能还有其他字段
  title?: string;
  brief_content?: string;
}

interface FeedResponse {
  err_no: number;
  err_msg?: string;
  data?: number; // next cursor
  has_more?: boolean;
  // 推荐流返回格式可能是 data 数组或带 cursor 的结构
}

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

interface FeedDataResponse {
  err_no: number;
  err_msg?: string;
  data?: FeedItem[];
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
      console.log(
        "[Juejin] 推荐流第 " + (page + 1) + " 页, cursor=" + cursor
      );

      var body = JSON.stringify({
        id_type: 2,
        sort_type: 200,
        cursor: cursor,
        limit: 20,
      });

      var response = await fetch(FEED_API, {
        method: "POST",
        headers: HEADERS,
        body: body,
      });

      if (!response.ok) {
        console.error(
          "[Juejin] 推荐流 API HTTP 错误: " + response.status
        );
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
        console.error(
          "[Juejin] 推荐流 API 错误: " + (data.err_msg || "未知")
        );
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
// 主入口：依次尝试两种方式，合并去重
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

  // 去重
  var uniquePosts = dedupPosts(allPosts);

  console.log("[Juejin] 爬取完成，共获取 " + uniquePosts.length + " 篇文章");
  return uniquePosts;
}
