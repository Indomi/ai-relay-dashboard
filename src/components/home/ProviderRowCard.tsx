import Link from "next/link";
import { Provider } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface ProviderRowCardProps {
  provider: Provider;
}

export function ProviderRowCard({ provider }: ProviderRowCardProps) {
  const minPrice =
    provider.models.length > 0
      ? Math.min(...provider.models.map((m) => m.inputPrice || 0), Infinity)
      : Infinity;

  const models = provider.models.slice(0, 3).map((m) => m.model);
  const moreModels = provider.models.length > 3 ? `+${provider.models.length - 3}` : "";

  // 获取渠道类型
  const getChannelType = () => {
    if (provider.tags?.some((t) => t.includes("官方"))) return "官方";
    if (provider.billingType === "subscription") return "订阅代充";
    if (provider.billingType === "token") return "API中转";
    return "混合方案";
  };

  return (
    <Card className="hover:shadow-md transition-all">
      <Link href={`/providers/${provider.id}`} className="block p-4">
        <div className="flex items-center gap-4">
          {/* 商家名 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">
                {provider.name}
              </h3>
              {provider.website && (
                <Badge variant="secondary" className="text-xs">
                  {getChannelType()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {models.join(", ")} {moreModels}
            </p>
          </div>

          {/* 最低价格 */}
          <div className="text-right px-4">
            <p className="font-bold text-lg text-blue-600">
              {minPrice < Infinity ? `¥${minPrice.toFixed(1)}` : "-"}
            </p>
            <p className="text-xs text-slate-400">/1M tokens</p>
          </div>

          {/* 支持模型数 */}
          <div className="text-center px-4">
            <p className="font-semibold text-slate-900">
              {provider.models.length}
            </p>
            <p className="text-xs text-slate-400">模型</p>
          </div>

          {/* 成功率 */}
          <div className="text-center px-4">
            <p className="font-semibold text-emerald-600">
              {provider.responseTime ? "96%" : "-"}
            </p>
            <p className="text-xs text-slate-400">成功率</p>
          </div>

          {/* 风险评分 */}
          <div className="text-center px-4">
            <p className={`font-semibold ${
              provider.heatScore && provider.heatScore > 70
                ? "text-emerald-600"
                : provider.heatScore && provider.heatScore > 40
                ? "text-amber-600"
                : "text-red-600"
            }`}>
              {provider.heatScore || "-"}
            </p>
            <p className="text-xs text-slate-400">风险分</p>
          </div>

          {/* 查看详情 */}
          <div className="text-right">
            <span className="text-blue-600 text-sm font-medium">查看详情 →</span>
          </div>
        </div>
      </Link>
    </Card>
  );
}
