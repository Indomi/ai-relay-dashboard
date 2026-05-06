import { RawPost, CrawlerResult, ExtractedProvider } from "./types";
import { Provider } from "../../src/lib/types";
import { crawlerConfigs } from "./config";
import { extractProviderFromPost, extractProviderWithDeepCrawl } from "./ai-extractor";
import { deduplicateAndMerge } from "./deduplicator";
import { crawlV2EX } from "./extractors/v2ex";
import { crawlNodeSeek } from "./extractors/nodeseek";
import { crawlLinuxDo } from "./extractors/linuxdo";
import { crawlJuejin } from "./extractors/juejin";
import { crawlRSS } from "./extractors/rss";
import { crawlWebSearch } from "./extractors/websearch";
import { crawlZhihu } from "./extractors/zhihu";
import { crawlJike } from "./extractors/jike";
import { crawlXiaohongshu } from "./extractors/xiaohongshu";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
const PROVIDERS_FILE = path.join(DATA_DIR, "providers.json");

// 加载现有商家数据
function loadProviders(): Provider[] {
  try {
    if (fs.existsSync(PROVIDERS_FILE)) {
      const data = fs.readFileSync(PROVIDERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("[Scheduler] Error loading providers:", error);
  }
  return [];
}

// 保存商家数据
function saveProviders(providers: Provider[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(providers, null, 2));
  } catch (error) {
    console.error("[Scheduler] Error saving providers:", error);
  }
}

// 运行单个爬虫
async function runCrawler(platform: string): Promise<CrawlerResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log(`[Scheduler] Starting crawler for ${platform}...`);

  try {
    // 只使用真实爬取，不使用模拟数据
    let posts: RawPost[] = [];

    switch (platform) {
      case "v2ex":
        posts = await crawlV2EX();
        break;
      case "nodeseek":
        posts = await crawlNodeSeek();
        break;
      case "linux.do":
        posts = await crawlLinuxDo();
        break;
      case "juejin":
        posts = await crawlJuejin();
        break;
      case "rss":
        posts = await crawlRSS();
        break;
      case "websearch":
        posts = await crawlWebSearch();
        break;
      case "zhihu":
        posts = await crawlZhihu();
        break;
      case "jike":
        posts = await crawlJike();
        break;
      case "xiaohongshu":
        posts = await crawlXiaohongshu();
        break;
      default:
        console.log(`[Scheduler] No crawler implemented for ${platform}`);
        return {
          platform,
          postsFound: 0,
          postsNew: 0,
          errors: ["No crawler implemented"],
          duration: Date.now() - startTime,
        };
    }

    if (posts.length === 0) {
      console.log(`[Scheduler] ${platform}: No posts found, skipping AI extraction`);
      return {
        platform,
        postsFound: 0,
        postsNew: 0,
        errors: ["No posts found"],
        duration: Date.now() - startTime,
      };
    }

    console.log(`[Scheduler] ${platform}: Found ${posts.length} posts`);

    // AI 提取（两步流程：先提取链接，再访问网站获取详情）
    const extractedList: {
      extracted: ExtractedProvider | null;
      source: { platform: string; url: string; title: string; author: string; publishedAt: string };
    }[] = [];

    for (const post of posts) {
      console.log(`[Scheduler] Processing post: ${post.title.substring(0, 50)}...`);

      // 使用两步提取流程
      const providers = await extractProviderWithDeepCrawl(post.title, post.content);

      if (providers.length > 0) {
        for (const provider of providers) {
          extractedList.push({
            extracted: provider,
            source: {
              platform: post.platform,
              url: post.url,
              title: post.title,
              author: post.author,
              publishedAt: post.publishedAt,
            },
          });
        }
      } else {
        // 如果两步提取失败，尝试单步提取
        const extracted = await extractProviderFromPost(post.title, post.content);
        extractedList.push({
          extracted,
          source: {
            platform: post.platform,
            url: post.url,
            title: post.title,
            author: post.author,
            publishedAt: post.publishedAt,
          },
        });
      }

      // 避免速率限制
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 去重合并
    const existingProviders = loadProviders();
    const { providers, newCount, updatedCount } = deduplicateAndMerge(
      extractedList,
      existingProviders
    );

    // 保存
    saveProviders(providers);

    const duration = Date.now() - startTime;
    console.log(
      `[Scheduler] ${platform}: ${newCount} new, ${updatedCount} updated in ${duration}ms`
    );

    return {
      platform,
      postsFound: posts.length,
      postsNew: newCount,
      errors,
      duration,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    errors.push(errMsg);
    console.error(`[Scheduler] Error crawling ${platform}:`, error);

    return {
      platform,
      postsFound: 0,
      postsNew: 0,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

// 运行所有爬虫
export async function runAllCrawlers(): Promise<CrawlerResult[]> {
  const results: CrawlerResult[] = [];

  for (const config of crawlerConfigs) {
    if (!config.enabled) {
      console.log(`[Scheduler] Skipping disabled crawler: ${config.platform}`);
      continue;
    }

    const result = await runCrawler(config.platform);
    results.push(result);

    // 爬虫间隔
    await new Promise((r) => setTimeout(r, 2000));
  }

  return results;
}

// 运行指定爬虫
export async function runSingleCrawler(platform: string): Promise<CrawlerResult> {
  const config = crawlerConfigs.find((c) => c.platform === platform);
  if (!config) {
    return {
      platform,
      postsFound: 0,
      postsNew: 0,
      errors: [`Unknown platform: ${platform}`],
      duration: 0,
    };
  }

  if (!config.enabled) {
    return {
      platform,
      postsFound: 0,
      postsNew: 0,
      errors: ["Crawler is disabled"],
      duration: 0,
    };
  }

  return runCrawler(platform);
}

// 打印统计
export function printStats(results: CrawlerResult[]): void {
  console.log("\n========== 爬虫运行统计 ==========");
  let totalPosts = 0;
  let totalNew = 0;
  let totalDuration = 0;

  for (const r of results) {
    console.log(`\n${r.platform}:`);
    console.log(`  发现帖子: ${r.postsFound}`);
    console.log(`  新增商家: ${r.postsNew}`);
    console.log(`  耗时: ${r.duration}ms`);
    if (r.errors.length > 0) {
      console.log(`  错误: ${r.errors.join(", ")}`);
    }
    totalPosts += r.postsFound;
    totalNew += r.postsNew;
    totalDuration += r.duration;
  }

  console.log("\n========== 总计 ==========");
  console.log(`总帖子: ${totalPosts}`);
  console.log(`总新增: ${totalNew}`);
  console.log(`总耗时: ${totalDuration}ms`);
  console.log("==========================\n");
}
