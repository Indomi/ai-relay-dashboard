import Link from "next/link";
import { Provider } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderListCardProps {
  provider: Provider;
}

export function ProviderListCard({ provider }: ProviderListCardProps) {
  const minPrice =
    provider.models.length > 0
      ? Math.min(...provider.models.map((m) => m.inputPrice || 0), Infinity)
      : Infinity;

  return (
    <Link href={`/providers/${provider.id}`}>
      <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-900">{provider.name}</h3>
              <div className="flex gap-2 mt-1">
                {provider.tags?.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {minPrice < Infinity ? `¥${minPrice.toFixed(1)}` : "-"}
              </p>
              <p className="text-xs text-slate-400">/1M tokens</p>
            </div>
          </div>

          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
            {provider.tags?.slice(0, 2).join(" · ") || "暂无标签"}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{provider.models.length} 个模型</span>
            <span className="text-blue-600 font-medium">查看详情 →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
