import { RawPost } from "../types";

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

// 带重试的 fetch，处理 429 限流
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

// 构建公共请求头
function buildHeaders(): { [key: string]: string } {
  return {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };
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

  var response = await fetchWithRetry(searchUrl, 3, buildHeaders());
  if (!response || !response.ok) {
    console.error("[Linux.do] Search API error: " + (response ? response.status : "no response") + " for keyword: " + keyword);
    return [];
  }

  var data: DiscourseSearchResult;
  try {
    data = await response.json();
  } catch (e) {
    console.error("[Linux.do] Failed to parse search JSON for keyword: " + keyword);
    return [];
  }

  var topics = data.topics || [];
  console.log("[Linux.do] Found " + topics.length + " topics for keyword: " + keyword);
  return topics;
}

// 获取帖子详情（通过 Discourse JSON API）
async function fetchTopicDetail(topicId: number): Promise<DiscourseTopicDetail | null> {
  var topicUrl = BASE_URL + "/t/" + topicId + ".json";
  console.log("[Linux.do] Fetching topic detail: " + topicId);

  var response = await fetchWithRetry(topicUrl, 3, buildHeaders());
  if (!response || !response.ok) {
    console.error("[Linux.do] Topic detail API error: " + (response ? response.status : "no response") + " for topic: " + topicId);
    return null;
  }

  try {
    var data: DiscourseTopicDetail = await response.json();
    return data;
  } catch (e) {
    console.error("[Linux.do] Failed to parse topic detail JSON for topic: " + topicId);
    return null;
  }
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

  var response = await fetchWithRetry(latestUrl, 3, buildHeaders());
  if (!response || !response.ok) {
    console.error("[Linux.do] Latest API error: " + (response ? response.status : "no response"));
    return [];
  }

  try {
    var data: DiscourseLatestResult = await response.json();
    var topics = data.topic_list ? data.topic_list.topics : [];
    console.log("[Linux.do] Found " + topics.length + " latest topics");
    return topics;
  } catch (e) {
    console.error("[Linux.do] Failed to parse latest topics JSON");
    return [];
  }
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
// 主函数：crawlLinuxDo
// ========================
export async function crawlLinuxDo(): Promise<RawPost[]> {
  console.log("[Linux.do] Starting crawler with Discourse Search API...");
  var posts: RawPost[] = [];
  processedTopicIds = {};

  // ---- Approach 1: Discourse Search API ----
  for (var k = 0; k < SEARCH_KEYWORDS.length; k++) {
    var keyword = SEARCH_KEYWORDS[k];

    try {
      var topics = await searchByKeyword(keyword);

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

  console.log("[Linux.do] Total posts fetched: " + posts.length);
  return posts;
}
