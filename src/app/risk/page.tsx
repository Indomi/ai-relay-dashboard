"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RiskRadarCard } from "@/components/home/RiskRadarCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Provider } from "@/lib/types";

function calculateRiskLevel(provider: Provider): "high" | "medium" | "low" | "unknown" {
  const tags = (provider.tags || []).map((t) => t.toLowerCase());
  const status = provider.status;

  if (status === "offline") return "high";
  if (tags.some((t) => t.includes("跑路") || t.includes("诈骗") || t.includes("scam"))) return "high";
  if (tags.some((t) => t.includes("慢") || t.includes("不稳定") || t.includes("封号"))) return "medium";
  if (tags.some((t) => t.includes("稳定") || t.includes("推荐") || t.includes("可靠"))) return "low";
  if (status === "online" && provider.heatScore > 50) return "low";
  if (status === "online") return "medium";
  return "unknown";
}

function getRiskDescription(provider: Provider): string {
  const tags = provider.tags || [];
  const parts: string[] = [];
  if (provider.status === "offline") parts.push("服务当前离线");
  if (provider.responseTime && provider.responseTime > 3000) parts.push(`响应时间较慢 (${provider.responseTime}ms)`);
  if (provider.heatScore > 0) parts.push(`热度 ${provider.heatScore}`);
  if (provider.mentionCount > 0) parts.push(`被提及 ${provider.mentionCount} 次`);
  if (tags.length > 0) parts.push(`标签: ${tags.join(", ")}`);
  return parts.length > 0 ? parts.join(" | ") : "暂无风险评估数据";
}

export default function RiskPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        setProviders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const enriched = providers.map((p) => ({
    ...p,
    riskLevel: calculateRiskLevel(p),
    riskDescription: getRiskDescription(p),
  }));

  const filtered = filter === "all" ? enriched : enriched.filter((p) => p.riskLevel === filter);

  const highCount = enriched.filter((p) => p.riskLevel === "high").length;
  const mediumCount = enriched.filter((p) => p.riskLevel === "medium").length;
  const lowCount = enriched.filter((p) => p.riskLevel === "low").length;

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
                <Link href="/risk" className="text-blue-600 font-medium">风险雷达</Link>
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">返回首页</Link>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">风险雷达</h1>
          <p className="text-slate-500 text-sm mt-1">基于社区反馈和运行状态评估商家风险等级</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 统计概览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="text-center py-4">
              <div className="text-2xl font-bold text-slate-900">{enriched.length}</div>
              <div className="text-xs text-slate-500 mt-1">总商家数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <div className="text-2xl font-bold text-red-600">{highCount}</div>
              <div className="text-xs text-slate-500 mt-1">高风险</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <div className="text-2xl font-bold text-amber-600">{mediumCount}</div>
              <div className="text-xs text-slate-500 mt-1">中等风险</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="text-center py-4">
              <div className="text-2xl font-bold text-emerald-600">{lowCount}</div>
              <div className="text-xs text-slate-500 mt-1">低风险</div>
            </CardContent>
          </Card>
        </div>

        {/* 筛选按钮 */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter("high")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "high" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border"
            }`}
          >
            高风险
          </button>
          <button
            onClick={() => setFilter("medium")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "medium" ? "bg-amber-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border"
            }`}
          >
            中等
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === "low" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border"
            }`}
          >
            低风险
          </button>
        </div>

        {/* 商家列表 */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">暂无匹配的商家数据</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((provider) => (
              <div key={provider.id} className="relative">
                <RiskRadarCard
                  title={provider.name}
                  description={provider.riskDescription}
                  level={provider.riskLevel}
                />
                <div className="absolute top-4 right-4 flex gap-1">
                  {provider.tags?.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="px-4 pb-2">
                  <Link
                    href={`/providers/${provider.id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
