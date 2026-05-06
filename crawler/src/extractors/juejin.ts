import { RawPost } from "../types";

// 掘金 API 端点
const JUEJIN_API = "https://api.juejin.cn/content_api/v1/article/recommend_all_feed";

// 搜索关键词
const KEYWORDS = ["API中转", "OpenAI", "GPT", "Claude", "AI API", "中转站", "API代理"];

interface JuejinArticle {
  article_id: string;
  title: string;
  brief_content: string;
  author_user_info: {
    user_name: string;
  };
  article_info: {
    title: string;
    brief_content: string;
    view_count: number;
    digg_count: number;
    ctime: string;
  };
}

interface JuejinResponse {
  err_no: number;
  data: JuejinArticle[];
}

// 通过掘金 API 获取文章
async function fetchJuejinArticles(): Promise<JuejinArticle[]> {
  try {
    const response = await fetch(JUEJIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id_type: 2,
        sort_type: 200,
        cate_id: "6809637773935378440",
        cursor: "0",
        limit: 20,
      }),
    });

    if (!response.ok) {
      console.error("[Juejin] API error:", response.status);
      return [];
    }

    const data = (await response.json()) as JuejinResponse;
    if (data.err_no !== 0) {
      console.error("[Juejin] API error:", data);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error("[Juejin] Fetch error:", error);
    return [];
  }
}

// 过滤相关文章
function filterRelevantArticles(articles: JuejinArticle[]): JuejinArticle[] {
  return articles.filter((article) => {
    const title = article.article_info?.title || "";
    const content = article.article_info?.brief_content || "";
    const text = `${title} ${content}`.toLowerCase();

    return KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  });
}

// 主爬虫函数
export async function crawlJuejin(): Promise<RawPost[]> {
  console.log("[Juejin] Starting crawler...");

  try {
    const articles = await fetchJuejinArticles();
    const relevant = filterRelevantArticles(articles);

    if (relevant.length > 0) {
      console.log(`[Juejin] Found ${relevant.length} relevant articles`);
      return relevant.map((article) => ({
        url: `https://juejin.cn/post/${article.article_id}`,
        platform: "juejin",
        title: article.article_info.title,
        content: article.article_info.brief_content,
        author: article.author_user_info.user_name,
        publishedAt: new Date(parseInt(article.article_info.ctime) * 1000).toISOString(),
        fetchedAt: new Date().toISOString(),
      }));
    }

    console.log("[Juejin] No relevant articles found");
    return [];
  } catch (error) {
    console.error("[Juejin] Crawl error:", error);
    return [];
  }
}
