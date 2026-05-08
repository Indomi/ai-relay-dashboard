"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { DailyTrend } from "@/components/dashboard/DailyTrend";
import { ModelCoverage } from "@/components/dashboard/ModelCoverage";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { CommunityFeed } from "@/components/dashboard/CommunityFeed";
import { SourceDistribution } from "@/components/dashboard/SourceDistribution";
import { RecentProviders } from "@/components/dashboard/RecentProviders";
import { Stats, Provider, CommunityPost } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, providersRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/providers"),
        ]);
        const statsData = await statsRes.json();
        const providersData = await providersRes.json();
        setStats(statsData);
        setProviders(providersData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 从 providers 的 sources 中提取社区帖子
  const communityPosts: CommunityPost[] = providers.flatMap((p) =>
    p.sources.map((s) => ({
      platform: s.platform,
      title: s.title,
      author: s.author,
      publishedAt: s.publishedAt,
      url: s.url,
      snippet: "",
    }))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-slate-900">
                Token Atlas
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/providers" className="text-slate-600 hover:text-slate-900">
                  实时榜单
                </Link>
                <Link href="/providers?sort=price" className="text-slate-600 hover:text-slate-900">
                  模型比价
                </Link>
                <Link href="/providers?type=subscription" className="text-slate-600 hover:text-slate-900">
                  订阅方案
                </Link>
                <Link href="/risk" className="text-slate-600 hover:text-slate-900">
                  风险雷达
                </Link>
                <Link href="/dashboard" className="text-blue-600 font-medium">
                  数据大盘
                </Link>
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              ← 返回首页
            </Link>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">数据大盘</h1>
            <p className="text-slate-500 text-sm mt-1">
              全局视角查看平台数据趋势与分布
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm">加载中...</div>
          </div>
        ) : stats && providers.length > 0 ? (
          <div className="space-y-6">
            {/* 统计卡片 */}
            <StatsCards stats={stats} />

            {/* 每日趋势 + 来源分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyTrend stats={stats} />
              <SourceDistribution stats={stats} />
            </div>

            {/* 模型覆盖 + 价格分布 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ModelCoverage stats={stats} />
              <PriceChart providers={providers} />
            </div>

            {/* 最新商家 + 社区动态 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentProviders providers={providers} />
              <CommunityFeed posts={communityPosts} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-sm">暂无数据</div>
          </div>
        )}
      </div>
    </div>
  );
}
