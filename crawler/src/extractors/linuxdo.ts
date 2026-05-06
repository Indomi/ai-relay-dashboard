import { RawPost } from "../types";
import * as cheerio from "cheerio";

var BASE_URL = "https://linux.do";

// 搜索关键词
var SEARCH_KEYWORDS = [
  "API中转",
  "OpenAI",
  "GPT",
  "Claude",
  "中转站",
  "API代理",
  "AI API",
  "one-api",
  "new-api",
];

// 内容预过滤关键词（小写匹配）
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

var REQUEST_DELAY = 2000;
var MAX_TOPICS_PER_KEYWORD = 5;
var MAX_POSTS_PER_TOPIC = 1;

// 多种 User-Agent 备选
var USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
];

// Discourse search API 接口类型
interface DiscourseTopic {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  created_at: string;
  last_posted_at: string;
  posts_count: number;
  like_count: number;
  views: number;
  category_id: number;
}

interface DiscourseSearchResult {
  topics: DiscourseTopic[];
  posts: DiscoursePost[];
  users: DiscourseUser[];
  categories: DiscourseCategory[];
  grouped_search_result: {
    term: string;
    more_full_page_results?: string;
    posts?: DiscoursePost[];
  };
}

interface DiscoursePost {
  id: number;
  topic_id: number;
  name: string;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  blurb: string;
}

interface DiscourseUser {
  id: number;
  username: string;
  name: string;
  avatar_template: string;
}

interface DiscourseCategory {
  id: number;
  name: string;
  slug: string;
}

// Discourse topic detail 接口类型
interface DiscoursePostStreamPost {
  id: number;
  name: string;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  reply_count: number;
  reads: number;
  score: number;
  yours: boolean;
  topic_id: number;
  topic_slug: string;
}

interface DiscourseTopicDetail {
  id: number;
  title: string;
  slug: string;
  created_at: string;
  last_posted_at: string;
  views: number;
  reply_count: number;
  like_count: number;
  category_id: number;
  post_stream: {
    posts: DiscoursePostStreamPost[];
    stream: number[];
  };
}

// Discourse latest topics 接口类型
interface DiscourseLatestTopic {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  created_at: string;
  last_posted_at: string;
  posts_count: number;
  like_count: number;
  views: number;
  category_id: number;
  pinned: boolean;
  visible: boolean;
  bumped_at: string;
}

interface DiscourseLatestResult {
  topic_list: {
    topics: DiscourseLatestTopic[];
    more_topics_url?: string;
  };
  users: DiscourseUser[];
}

// 已处理的 topic id 集合，避免重复
var processedTopicIds: { [key: string]: boolean } = {};

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// 构建公共请求头（多种策略）
function buildHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    "Accept": "application/json",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };
}

// 构建 HTML 页面请求头
function buildHtmlHeaders(uaIndex: number): { [key: string]: string } {
  return {
    "User-Agent": USER_AGENTS[uaIndex % USER_AGENTS.length],
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
  };
}

// 带重试的 fetch，处理 429 限流和 403
async function fetchWithRetry(
  url: string,
  maxRetries: number,
  headers: { [key: string]: string }
): Promise<Response | null> {
  for (var attempt = 0; attempt < maxRetries; attempt++) {
    try {
      var response = await fetch(url, { headers: headers });

      if (response.status === 429) {
        var retryAfter = response.headers.get("Retry-After");
        var waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : (attempt + 1) * 5000;
        console.log(
          "[Linux.do] Rate limited (429), waiting " + (waitTime / 1000) + "s before retry " + (attempt + 1) + "/" + maxRetries
        );
        await delay(waitTime);
        continue;
      }

      if (response.status === 403) {
        console.log(
          "[Linux.do] 403 Forbidden for " + url + " (attempt " + (attempt + 1) + "/" + maxRetries + ")"
        );
        if (attempt < maxRetries - 1) {
          // 尝试换 User-Agent 重试
          var newHeaders: { [key: string]: string } = {};
          for (var key in headers) {
            newHeaders[key] = headers[key];
          }
          newHeaders["User-Agent"] = USER_AGENTS[(attempt + 1) % USER_AGENTS.length];
          // 添加 cookie-like headers
          newHeaders["Cookie"] = "_forum_session=linux-do-crawler-session";
          headers = newHeaders;
          await delay((attempt + 1) * 3000);
          continue;
        }
      }

      return response;
    } catch (error) {
      console.error("[Linux.do] Fetch error (attempt " + (attempt + 1) + "/" + maxRetries + "):", error);
      if (attempt < maxRetries - 1) {
        await delay((attempt + 1) * 3000);
      }
    }
  }
  return null;
}

// 去除 HTML 标签
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// 内容预过滤：检查文本是否包含至少一个预过滤关键词
function passesContentFilter(text: string): boolean {
  var lowerText = text.toLowerCase();
  for (var i = 0; i < CONTENT_FILTER_KEYWORDS.length; i++) {
    if (lowerText.indexOf(CONTENT_FILTER_KEYWORDS[i]) !== -1) {
      return true;
    }
  }
  return false;
}

// 构建帖子 URL
function buildTopicUrl(topicId: number, slug: string): string {
  return BASE_URL + "/t/" + topicId;
}

// ========================
// Approach 1: Discourse Search API（主要方式）
// ========================
async function searchByKeyword(keyword: string): Promise<DiscourseTopic[]> {
  var searchUrl = BASE_URL + "/search.json?q=" + encodeURIComponent(keyword) + "&page=1";
  console.log("[Linux.do] Searching keyword: " + keyword);

  // 策略1: 标准 Accept: application/json
  var response = await fetchWithRetry(searchUrl, 3, buildHeaders(0));
  if (response && response.ok) {
    try {
      var data: DiscourseSearchResult = await response.json();
      var topics = data.topics || [];
      if (topics.length > 0) {
        console.log("[Linux.do] Found " + topics.length + " topics for keyword: " + keyword + " (strategy 1)");
        return topics;
      }
    } catch (e) {
      console.error("[Linux.do] Failed to parse search JSON for keyword: " + keyword + " (strategy 1)");
    }
  }

  await delay(2000);

  // 策略2: 不同 User-Agent + cookie headers
  for (var uaIdx = 1; uaIdx < USER_AGENTS.length; uaIdx++) {
    var headers2 = buildHeaders(uaIdx);
    headers2["Cookie"] = "_forum_session=linux-do-crawler-session";
    response = await fetchWithRetry(searchUrl, 1, headers2);
    if (response && response.ok) {
      try {
        var data2: DiscourseSearchResult = await response.json();
        var topics2 = data2.topics || [];
        if (topics2.length > 0) {
          console.log("[Linux.do] Found " + topics2.length + " topics for keyword: " + keyword + " (strategy 2, UA " + uaIdx + ")");
          return topics2;
        }
      } catch (e) {
        // 继续尝试
      }
    }
    await delay(2000);
  }

  console.error("[Linux.do] Search API failed for keyword: " + keyword);
  return [];
}

// 获取帖子详情（通过 Discourse JSON API）
async function fetchTopicDetail(topicId: number): Promise<DiscourseTopicDetail | null> {
  var topicUrl = BASE_URL + "/t/" + topicId + ".json";
  console.log("[Linux.do] Fetching topic detail: " + topicId);

  // 策略1: 标准 JSON 请求
  var response = await fetchWithRetry(topicUrl, 3, buildHeaders(0));
  if (response && response.ok) {
    try {
      var data: DiscourseTopicDetail = await response.json();
      return data;
    } catch (e) {
      console.error("[Linux.do] Failed to parse topic detail JSON for topic: " + topicId);
    }
  }

  await delay(2000);

  // 策略2: 带 cookie headers
  var headers2 = buildHeaders(1);
  headers2["Cookie"] = "_forum_session=linux-do-crawler-session";
  response = await fetchWithRetry(topicUrl, 2, headers2);
  if (response && response.ok) {
    try {
      var data2: DiscourseTopicDetail = await response.json();
      return data2;
    } catch (e) {
      console.error("[Linux.do] Failed to parse topic detail JSON for topic: " + topicId + " (strategy 2)");
    }
  }

  console.error("[Linux.do] Topic detail API failed for topic: " + topicId);
  return null;
}

// 从 topic 详情中提取 RawPost
function extractPostsFromTopicDetail(topicDetail: DiscourseTopicDetail, topicSlug: string): RawPost[] {
  var posts: RawPost[] = [];
  var topicUrl = buildTopicUrl(topicDetail.id, topicSlug);

  var streamPosts = topicDetail.post_stream ? topicDetail.post_stream.posts : [];
  if (!streamPosts || streamPosts.length === 0) {
    return posts;
  }

  // 只取前几条帖子（第一帖为主帖）
  var postsToProcess = streamPosts.slice(0, MAX_POSTS_PER_TOPIC);

  for (var i = 0; i < postsToProcess.length; i++) {
    var post = postsToProcess[i];
    var rawContent = stripHtml(post.cooked || "");
    var title = topicDetail.title || "";

    // 内容预过滤：标题或内容需要包含至少一个预过滤关键词
    var combinedText = title + " " + rawContent;
    if (!passesContentFilter(combinedText)) {
      console.log("[Linux.do] Post filtered out (no matching keywords): " + title);
      continue;
    }

    // 如果是回复帖（非第一帖），在标题后加上标识
    var displayTitle = title;
    if (post.post_number > 1) {
      displayTitle = title + " (回复 #" + post.post_number + ")";
    }

    posts.push({
      url: topicUrl + "/" + post.post_number,
      platform: "linux.do",
      title: displayTitle,
      content: rawContent,
      author: post.username || "unknown",
      publishedAt: post.created_at || topicDetail.created_at || new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
    });
  }

  return posts;
}

// ========================
// Approach 2: Latest Topics（备用方式）
// ========================
async function fetchLatestTopics(): Promise<DiscourseLatestTopic[]> {
  var latestUrl = BASE_URL + "/latest.json";
  console.log("[Linux.do] Fetching latest topics as fallback...");

  // 策略1: 标准 JSON 请求
  var response = await fetchWithRetry(latestUrl, 3, buildHeaders(0));
  if (response && response.ok) {
    try {
      var data: DiscourseLatestResult = await response.json();
      var topics = data.topic_list ? data.topic_list.topics : [];
      if (topics.length > 0) {
        console.log("[Linux.do] Found " + topics.length + " latest topics (strategy 1)");
        return topics;
      }
    } catch (e) {
      console.error("[Linux.do] Failed to parse latest topics JSON (strategy 1)");
    }
  }

  await delay(2000);

  // 策略2: 不同 User-Agent + cookie
  for (var uaIdx = 1; uaIdx < USER_AGENTS.length; uaIdx++) {
    var headers2 = buildHeaders(uaIdx);
    headers2["Cookie"] = "_forum_session=linux-do-crawler-session";
    response = await fetchWithRetry(latestUrl, 1, headers2);
    if (response && response.ok) {
      try {
        var data2: DiscourseLatestResult = await response.json();
        var topics2 = data2.topic_list ? data2.topic_list.topics : [];
        if (topics2.length > 0) {
          console.log("[Linux.do] Found " + topics2.length + " latest topics (strategy 2, UA " + uaIdx + ")");
          return topics2;
        }
      } catch (e) {
        // 继续
      }
    }
    await delay(2000);
  }

  console.error("[Linux.do] Latest API failed");
  return [];
}

// 从 latest topics 中按关键词过滤
function filterLatestTopicsByKeywords(topics: DiscourseLatestTopic[]): DiscourseLatestTopic[] {
  var filtered: DiscourseLatestTopic[] = [];
  for (var i = 0; i < topics.length; i++) {
    var topic = topics[i];
    var combinedText = (topic.title || "") + " " + (topic.excerpt || "");
    if (passesContentFilter(combinedText)) {
      filtered.push(topic);
    }
  }
  console.log("[Linux.do] Filtered " + filtered.length + " latest topics by keywords");
  return filtered;
}

// ========================
// Approach 3: HTML 搜索页面解析（sov2ex 风格）
// ========================
async function searchViaHtml(keyword: string): Promise<DiscourseTopic[]> {
  var searchUrl = BASE_URL + "/search?q=" + encodeURIComponent(keyword);
  console.log("[Linux.do] 尝试 HTML 搜索页面: " + searchUrl);

  for (var uaIdx = 0; uaIdx < USER_AGENTS.length; uaIdx++) {
    try {
      var headers = buildHtmlHeaders(uaIdx);
      headers["Cookie"] = "_forum_session=linux-do-crawler-session";
      var response = await fetch(searchUrl, { headers: headers });

      if (response && response.ok) {
        var html = await response.text();
        var topics = parseSearchHtml(html);
        if (topics.length > 0) {
          console.log("[Linux.do] HTML 搜索解析到 " + topics.length + " 条 (UA " + uaIdx + ")");
          return topics;
        }
      }
    } catch (err) {
      console.log("[Linux.do] HTML 搜索异常 (UA " + uaIdx + "): " + (err instanceof Error ? err.message : String(err)));
    }
    await delay(2000);
  }

  console.log("[Linux.do] HTML 搜索页面未获取到结果");
  return [];
}

// 解析 HTML 搜索结果页面
function parseSearchHtml(html: string): DiscourseTopic[] {
  var topics: DiscourseTopic[] = [];
  var $ = cheerio.load(html);

  // Discourse 搜索结果通常在 .fps-result 或 .search-result 中
  $(".fps-result, .search-result, .topic-list-item").each(function (_, element) {
    var $el = $(element);
    var $link = $el.find("a.title, a[href*='/t/']").first();
    var href = $link.attr("href") || "";
    var title = $link.text().trim();

    if (!title) {
      title = $el.find(".title, .topic-title").first().text().trim();
    }

    if (!title || title.length < 4) {
      return;
    }

    // 从 href 中提取 topic id
    var topicId = 0;
    var match = href.match(/\/t\/[^\/]*\/(\d+)/);
    if (match) {
      topicId = parseInt(match[1], 10);
    } else {
      match = href.match(/\/t\/(\d+)/);
      if (match) {
        topicId = parseInt(match[1], 10);
      }
    }

    if (topicId === 0) {
      return;
    }

    // 提取摘要
    var excerpt = $el.find(".blurb, .excerpt, .summary, .topic-excerpt").first().text().trim();

    topics.push({
      id: topicId,
      title: title,
      slug: "",
      excerpt: excerpt,
      created_at: new Date().toISOString(),
      last_posted_at: new Date().toISOString(),
      posts_count: 0,
      like_count: 0,
      views: 0,
      category_id: 0,
    });
  });

  // 去重
  var seen = new Set<number>();
  var unique: DiscourseTopic[] = [];
  for (var i = 0; i < topics.length; i++) {
    if (!seen.has(topics[i].id)) {
      seen.add(topics[i].id);
      unique.push(topics[i]);
    }
  }

  return unique;
}

// ========================
// Approach 4: 直接抓取单个 topic HTML 页面
// ========================
async function fetchTopicViaHtml(topicId: number): Promise<RawPost | null> {
  var topicUrl = BASE_URL + "/t/" + topicId;
  console.log("[Linux.do] 尝试 HTML 方式抓取 topic: " + topicId);

  for (var uaIdx = 0; uaIdx < USER_AGENTS.length; uaIdx++) {
    try {
      var headers = buildHtmlHeaders(uaIdx);
      headers["Cookie"] = "_forum_session=linux-do-crawler-session";
      var response = await fetch(topicUrl, { headers: headers });

      if (response && response.ok) {
        var html = await response.text();
        var post = parseTopicHtml(topicId, html);
        if (post) {
          return post;
        }
      }
    } catch (err) {
      console.log("[Linux.do] HTML topic 抓取异常 (UA " + uaIdx + "): " + (err instanceof Error ? err.message : String(err)));
    }
    await delay(2000);
  }

  return null;
}

// 解析 topic HTML 页面
function parseTopicHtml(topicId: number, html: string): RawPost | null {
  var $ = cheerio.load(html);

  // 提取标题
  var title = $("#topic-title, .fancy-title, h1").first().text().trim();
  if (!title) {
    title = $("title").text().trim();
  }

  // 提取正文内容（第一个帖子）
  var content = "";
  var $post = $(".topic-post, .cooked, article").first();
  if ($post.length > 0) {
    content = $post.text().trim();
  }
  // 备用：尝试更宽泛的选择器
  if (!content) {
    var $body = $(".post-body, .topic-body, .item, .contents").first();
    if ($body.length > 0) {
      content = $body.text().trim();
    }
  }

  // 提取作者
  var author = "";
  var $author = $(".username, .names .username, .first-post .username").first();
  if ($author.length > 0) {
    author = $author.text().trim();
  }

  // 提取时间
  var publishedAt = "";
  var $time = $("time, .post-date, .created-at").first();
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
    return null;
  }

  // 内容预过滤
  if (!passesContentFilter(title + " " + content)) {
    return null;
  }

  return {
    url: BASE_URL + "/t/" + topicId,
    platform: "linux.do",
    title: title,
    content: content,
    author: author || "unknown",
    publishedAt: publishedAt,
    fetchedAt: new Date().toISOString(),
  };
}

// ========================
// 主函数：crawlLinuxDo
// ========================
export async function crawlLinuxDo(): Promise<RawPost[]> {
  console.log("[Linux.do] Starting crawler with multiple strategies...");
  var posts: RawPost[] = [];
  processedTopicIds = {};

  // ---- Approach 1: Discourse Search API ----
  var searchApiWorked = false;
  for (var k = 0; k < SEARCH_KEYWORDS.length; k++) {
    var keyword = SEARCH_KEYWORDS[k];

    try {
      var topics = await searchByKeyword(keyword);

      if (topics.length > 0) {
        searchApiWorked = true;
      }

      for (var t = 0; t < topics.length && t < MAX_TOPICS_PER_KEYWORD; t++) {
        var topic = topics[t];

        // 跳过已处理的 topic
        if (processedTopicIds[String(topic.id)]) {
          continue;
        }
        processedTopicIds[String(topic.id)] = true;

        // 对搜索结果本身做预过滤
        var searchPreview = (topic.title || "") + " " + (topic.excerpt || "");
        if (!passesContentFilter(searchPreview)) {
          console.log("[Linux.do] Search result filtered out (no matching keywords): " + topic.title);
          continue;
        }

        try {
          var topicDetail = await fetchTopicDetail(topic.id);
          if (topicDetail) {
            var extractedPosts = extractPostsFromTopicDetail(topicDetail, topic.slug);
            for (var p = 0; p < extractedPosts.length; p++) {
              posts.push(extractedPosts[p]);
            }
          }
        } catch (error) {
          console.error("[Linux.do] Error fetching topic detail for id " + topic.id + ":", error);
        }

        // 请求间延迟
        await delay(REQUEST_DELAY);
      }

      // 关键词间延迟
      await delay(REQUEST_DELAY);
    } catch (error) {
      console.error("[Linux.do] Error searching keyword \"" + keyword + "\":", error);
    }
  }

  console.log("[Linux.do] Search API yielded " + posts.length + " posts");

  // ---- Approach 2: Latest Topics (补充) ----
  // 如果搜索 API 返回结果较少，用 latest.json 补充
  if (posts.length < 10) {
    console.log("[Linux.do] Supplementing with latest topics...");
    try {
      var latestTopics = await fetchLatestTopics();
      var filteredLatest = filterLatestTopicsByKeywords(latestTopics);

      for (var lt = 0; lt < filteredLatest.length && posts.length < 30; lt++) {
        var latestTopic = filteredLatest[lt];

        // 跳过已处理的 topic
        if (processedTopicIds[String(latestTopic.id)]) {
          continue;
        }
        processedTopicIds[String(latestTopic.id)] = true;

        try {
          var latestDetail = await fetchTopicDetail(latestTopic.id);
          if (latestDetail) {
            var latestPosts = extractPostsFromTopicDetail(latestDetail, latestTopic.slug);
            for (var lp = 0; lp < latestPosts.length; lp++) {
              posts.push(latestPosts[lp]);
            }
          }
        } catch (error) {
          console.error("[Linux.do] Error fetching latest topic detail for id " + latestTopic.id + ":", error);
        }

        await delay(REQUEST_DELAY);
      }
    } catch (error) {
      console.error("[Linux.do] Error fetching latest topics:", error);
    }
  }

  console.log("[Linux.do] After latest topics: " + posts.length + " posts");

  // ---- Approach 3: HTML 搜索页面 (补充) ----
  // 如果以上方式结果仍然较少，尝试 HTML 搜索页面
  if (posts.length < 10) {
    console.log("[Linux.do] Supplementing with HTML search pages...");
    var htmlKeywords = SEARCH_KEYWORDS.slice(0, 3);
    for (var hk = 0; hk < htmlKeywords.length && posts.length < 30; hk++) {
      try {
        var htmlTopics = await searchViaHtml(htmlKeywords[hk]);

        for (var ht = 0; ht < htmlTopics.length && ht < MAX_TOPICS_PER_KEYWORD; ht++) {
          var htmlTopic = htmlTopics[ht];

          if (processedTopicIds[String(htmlTopic.id)]) {
            continue;
          }
          processedTopicIds[String(htmlTopic.id)] = true;

          var htmlPreview = (htmlTopic.title || "") + " " + (htmlTopic.excerpt || "");
          if (!passesContentFilter(htmlPreview)) {
            continue;
          }

          // 先尝试 JSON API 获取详情
          try {
            var htmlDetail = await fetchTopicDetail(htmlTopic.id);
            if (htmlDetail) {
              var htmlExtracted = extractPostsFromTopicDetail(htmlDetail, htmlTopic.slug);
              for (var hp = 0; hp < htmlExtracted.length; hp++) {
                posts.push(htmlExtracted[hp]);
              }
              continue;
            }
          } catch (e) {
            // JSON API 失败，尝试 HTML 方式
          }

          // 备用：直接抓取 HTML 页面
          try {
            var htmlPost = await fetchTopicViaHtml(htmlTopic.id);
            if (htmlPost) {
              posts.push(htmlPost);
            }
          } catch (e) {
            console.error("[Linux.do] Error fetching topic HTML for id " + htmlTopic.id + ":", e);
          }

          await delay(REQUEST_DELAY);
        }

        await delay(REQUEST_DELAY);
      } catch (error) {
        console.error("[Linux.do] Error in HTML search for keyword \"" + htmlKeywords[hk] + "\":", error);
      }
    }
  }

  console.log("[Linux.do] Total posts fetched: " + posts.length);
  return posts;
}
