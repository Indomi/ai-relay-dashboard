"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataSource {
  name: string;
  description: string;
  enabled: boolean;
  lastCrawled: string;
  category: string;
}

const dataSources: DataSource[] = [
  {
    name: "V2EX",
    description: "中国最大的创意工作者社区，活跃的 API 中转讨论板块",
    enabled: true,
    lastCrawled: "2026-05-08 16:30",
    category: "技术社区",
  },
  {
    name: "小红书",
    description: "生活方式分享平台，包含用户对 API 服务的真实使用体验",
    enabled: true,
    lastCrawled: "2026-05-08 15:00",
    category: "社交媒体",
  },
  {
    name: "NodeSeek",
    description: "专注于 VPS 和服务器讨论的技术社区",
    enabled: true,
    lastCrawled: "2026-05-08 14:20",
    category: "技术社区",
  },
  {
    name: "Linux.do",
    description: "Linux 和开源技术爱好者社区，活跃的 AI API 讨论",
    enabled: true,
    lastCrawled: "2026-05-08 13:45",
    category: "技术社区",
  },
  {
    name: "掘金",
    description: "开发者技术社区，包含 API 使用教程和评测文章",
    enabled: true,
    lastCrawled: "2026-05-08 12:00",
    category: "技术博客",
  },
  {
    name: "即刻",
    description: "兴趣社交平台，AI 圈活跃的讨论社区",
    enabled: true,
    lastCrawled: "2026-05-08 11:30",
    category: "社交媒体",
  },
  {
    name: "知乎",
    description: "中文问答社区，包含 API 服务的深度评测和对比",
    enabled: true,
    lastCrawled: "2026-05-08 10:00",
    category: "问答社区",
  },
  {
    name: "Telegram",
    description: "即时通讯平台，多个 API 中转相关的频道和群组",
    enabled: true,
    lastCrawled: "2026-05-08 09:00",
    category: "即时通讯",
  },
  {
    name: "RSS",
    description: "通过 RSS 订阅源自动获取各平台最新内容",
    enabled: true,
    lastCrawled: "2026-05-08 16:00",
    category: "聚合订阅",
  },
  {
    name: "全网搜索",
    description: "基于搜索引擎的补充数据，覆盖长尾关键词和新兴商家",
    enabled: true,
    lastCrawled: "2026-05-08 08:00",
    category: "搜索引擎",
  },
];

export default function SourcesPage() {
  const enabledCount = dataSources.filter((s) => s.enabled).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-slate-900">Token Atlas</Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/providers" className="text-slate-600 hover:text-slate-900">实时榜单</Link>
                <Link href="/providers?sort=price" className="text-slate-600 hover:text-slate-900">模型比价</Link>
                <Link href="/providers?type=subscription" className="text-slate-600 hover:text-slate-900">订阅方案</Link>
                <Link href="/risk" className="text-slate-600 hover:text-slate-900">风险雷达</Link>
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">返回首页</Link>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">数据来源</h1>
          <p className="text-slate-500 text-sm mt-1">
            当前已启用 {enabledCount}/{dataSources.length} 个数据源，持续抓取最新信息
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {dataSources.map((source) => (
            <Card key={source.name}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900">{source.name}</h3>
                      <Badge
                        variant="secondary"
                        className={
                          source.enabled
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs"
                        }
                      >
                        {source.enabled ? "已启用" : "未启用"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {source.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">{source.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-400">最后抓取</div>
                    <div className="text-sm text-slate-600 mt-0.5">{source.lastCrawled}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            <strong>提示：</strong>所有数据源均通过自动化爬虫定期抓取，数据经过 AI 提取和去重处理。
            如果你想推荐新的数据源，请通过{" "}
            <Link href="/contact" className="underline hover:text-blue-900">
              联系我们
            </Link>{" "}
            页面提交建议。
          </p>
        </div>
      </div>
    </div>
  );
}
