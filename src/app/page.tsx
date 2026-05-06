import { StatsCards } from "@/components/dashboard/StatsCards";
import { ModelCoverage } from "@/components/dashboard/ModelCoverage";
import { PriceChart } from "@/components/dashboard/PriceChart";
import { RecentProviders } from "@/components/dashboard/RecentProviders";
import { CommunityFeed } from "@/components/dashboard/CommunityFeed";
import { DailyTrend } from "@/components/dashboard/DailyTrend";
import { SourceDistribution } from "@/components/dashboard/SourceDistribution";
import { getProviders, getStats, getCommunityPosts } from "@/lib/data/providers";

export default function DashboardPage() {
  const stats = getStats();
  const providers = getProviders();
  const posts = getCommunityPosts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI中转商大盘</h1>
        <p className="text-muted-foreground text-sm mt-1">全网AI中转商信息聚合 · 实时更新</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 space-y-4">
          <ModelCoverage stats={stats} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PriceChart providers={providers} />
            <DailyTrend stats={stats} />
          </div>
        </div>
        <div className="space-y-4">
          <RecentProviders providers={providers} />
          <CommunityFeed posts={posts} />
          <SourceDistribution stats={stats} />
        </div>
      </div>
    </div>
  );
}
