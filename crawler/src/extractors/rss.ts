import { RawPost } from "../types";

// ============================================================
// RSS 爬虫 - 技术博客 RSS 订阅源
// 使用正则手动解析 XML，不依赖 cheerio
// ============================================================

// RSS 源配置
var RSS_SOURCES = [
  {
    name: "V2EX Latest",
    url: "https://www.v2ex.com/index.xml",
    platform: "v2ex",
  },
  {
    name: "V2EX Hot (RSSHub)",
    url: "https://rsshub.app/v2ex/topics/hot",
    platform: "v2ex",
  },
  {
    name: "NodeSeek Hot (RSSHub)",
    url: "https://rsshub.app/nodeseek/posts/hot",
    platform: "nodeseek",
  },
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
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
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
// RSS XML 手动解析（使用正则，不依赖 cheerio）
// ============================================================

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
}

/**
 * 从 XML 文本中提取所有 <item>...</item> 块
 */
function extractItemBlocks(xml: string): string[] {
  var blocks: string[] = [];
  // 非贪婪匹配 <item>...</item>
  var itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  var match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

/**
 * 从 XML 文本中提取所有 <entry>...</entry> 块（Atom 格式）
 */
function extractEntryBlocks(xml: string): string[] {
  var blocks: string[] = [];
  var entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  var match: RegExpExecArray | null;

  while ((match = entryRegex.exec(xml)) !== null) {
    blocks.push(match[1]);
  }

  return blocks;
}

/**
 * 从 XML 片段中提取标签内容
 * 支持普通标签和带命名空间的标签（如 dc:creator）
 */
function extractTagValue(block: string, tagName: string): string {
  // 尝试匹配 <tagName>...</tagName> 或 <tagName attr>...</tagName>
  var patterns = [
    new RegExp("<" + tagName + "[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></" + tagName + ">", "i"),
    new RegExp("<" + tagName + "[^>]*>([\\s\\S]*?)</" + tagName + ">", "i"),
  ];

  for (var p = 0; p < patterns.length; p++) {
    var m = patterns[p].exec(block);
    if (m && m[1]) {
      return m[1].trim();
    }
  }

  return "";
}

/**
 * 从 XML 片段中提取 <link> 标签的 href 属性（Atom 格式）
 */
function extractLinkHref(block: string): string {
  var linkRegex = /<link[^>]*href=["']([^"']*)["'][^>]*\/?>/i;
  var m = linkRegex.exec(block);
  if (m && m[1]) {
    return m[1].trim();
  }
  // 备用：直接取 <link> 标签内容
  return extractTagValue(block, "link");
}

/**
 * 去除 HTML 标签，提取纯文本
 */
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "--")
    .replace(/&rdquo;/g, "\u201d")
    .replace(/&ldquo;/g, "\u201c")
    .trim();
}

/**
 * 解析 RSS XML 文本，提取所有条目
 * 支持 RSS 2.0 (<item>) 和 Atom (<entry>) 格式
 */
function parseRSSXML(xml: string): RSSItem[] {
  var items: RSSItem[] = [];

  // 尝试 RSS 2.0 格式 (<item>)
  var itemBlocks = extractItemBlocks(xml);

  if (itemBlocks.length > 0) {
    for (var i = 0; i < itemBlocks.length; i++) {
      var block = itemBlocks[i];

      var title = extractTagValue(block, "title");
      var link = extractTagValue(block, "link");
      var description = extractTagValue(block, "description");
      var pubDate = extractTagValue(block, "pubDate");
      var author =
        extractTagValue(block, "author") ||
        extractTagValue(block, "dc:creator") ||
        extractTagValue(block, "dc\\:creator") ||
        "";

      // 去除 HTML 标签
      title = stripHtml(title);
      description = stripHtml(description);

      if (!title && !link) {
        continue;
      }

      items.push({
        title: title,
        link: link,
        description: description,
        pubDate: pubDate,
        author: author || "unknown",
      });
    }
  }

  // 如果没有找到 <item>，尝试 Atom 格式 (<entry>)
  if (items.length === 0) {
    var entryBlocks = extractEntryBlocks(xml);

    for (var j = 0; j < entryBlocks.length; j++) {
      var entry = entryBlocks[j];

      var entryTitle = extractTagValue(entry, "title");
      var entryLink = extractLinkHref(entry);
      var entrySummary =
        extractTagValue(entry, "summary") ||
        extractTagValue(entry, "content");
      var entryUpdated =
        extractTagValue(entry, "updated") ||
        extractTagValue(entry, "published");
      var entryAuthor = extractTagValue(entry, "author");

      // Atom 的 <author> 可能包含子标签 <name>
      if (!entryAuthor) {
        entryAuthor = extractTagValue(entry, "name");
      }

      // 去除 HTML 标签
      entryTitle = stripHtml(entryTitle);
      entrySummary = stripHtml(entrySummary);

      if (!entryTitle && !entryLink) {
        continue;
      }

      items.push({
        title: entryTitle,
        link: entryLink,
        description: entrySummary,
        pubDate: entryUpdated,
        author: entryAuthor || "unknown",
      });
    }
  }

  return items;
}

// ============================================================
// 获取单个 RSS 源
// ============================================================

async function fetchRSSSource(
  source: { name: string; url: string; platform: string }
): Promise<RawPost[]> {
  console.log("[RSS] 获取 " + source.name + ": " + source.url);
  var posts: RawPost[] = [];

  try {
    var response = await fetch(source.url, {
      headers: HEADERS,
    });

    if (!response.ok) {
      console.error(
        "[RSS] " + source.name + " HTTP 错误: " + response.status
      );
      return posts;
    }

    var xml = await response.text();

    if (!xml || xml.length < 50) {
      console.log("[RSS] " + source.name + " 返回内容为空或过短");
      return posts;
    }

    var items = parseRSSXML(xml);
    console.log("[RSS] " + source.name + " 解析到 " + items.length + " 条");

    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      if (!item.link && !item.title) {
        continue;
      }

      // 如果 link 是相对路径，补全为完整 URL
      if (item.link && item.link.indexOf("http") !== 0) {
        try {
          var baseUrl = new URL(source.url);
          item.link = baseUrl.origin + item.link;
        } catch (e) {
          // 无法补全 URL，跳过
          continue;
        }
      }

      // 内容预过滤
      if (!passesContentFilter(item.title, item.description)) {
        continue;
      }

      console.log("[RSS] " + source.name + " 相关: " + item.title);

      // 解析发布时间
      var publishedAt = "";
      if (item.pubDate) {
        try {
          var parsed = new Date(item.pubDate);
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed.toISOString();
          }
        } catch (e) {
          // 时间解析失败
        }
      }
      if (!publishedAt) {
        publishedAt = new Date().toISOString();
      }

      posts.push({
        url: item.link || "",
        platform: source.platform,
        title: item.title,
        content: item.description,
        author: item.author || "unknown",
        publishedAt: publishedAt,
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(
      "[RSS] " +
        source.name +
        " 异常: " +
        (error instanceof Error ? error.message : String(error))
    );
  }

  return posts;
}

// ============================================================
// 主入口：依次尝试所有 RSS 源，合并去重
// ============================================================

export async function crawlRSS(): Promise<RawPost[]> {
  console.log("[RSS] 开始爬取 RSS 源...");

  var allPosts: RawPost[] = [];

  for (var i = 0; i < RSS_SOURCES.length; i++) {
    var source = RSS_SOURCES[i];

    try {
      var posts = await fetchRSSSource(source);
      allPosts = allPosts.concat(posts);
    } catch (err) {
      console.error(
        "[RSS] " +
          source.name +
          " 失败，跳过: " +
          (err instanceof Error ? err.message : String(err))
      );
    }

    // 请求间隔 1000ms
    if (i < RSS_SOURCES.length - 1) {
      await delay(1000);
    }
  }

  // 去重
  var uniquePosts = dedupPosts(allPosts);

  console.log("[RSS] 爬取完成，共获取 " + uniquePosts.length + " 条相关内容");
  return uniquePosts;
}
