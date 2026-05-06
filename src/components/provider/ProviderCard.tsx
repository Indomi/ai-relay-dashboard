import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BillingBadge } from "@/components/shared/BillingBadge";
import { Badge } from "@/components/ui/badge";
import { Provider } from "@/lib/types";
import { formatPrice, formatModelName, formatRelativeTime } from "@/lib/format";
import { Clock, Zap, Globe } from "lucide-react";

interface ProviderCardProps {
  provider: Provider;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const minPrice = Math.min(...provider.models.map(m => m.inputPrice));
  const topModels = provider.models.slice(0, 3);

  return (
    <Link href={`/providers/${provider.id}`}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{provider.name}</h3>
                <StatusBadge status={provider.status} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <BillingBadge type={provider.billingType} />
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(provider.lastUpdated)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-600">{formatPrice(minPrice)}</p>
              <p className="text-xs text-muted-foreground">/1M tokens</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {topModels.map(m => (
              <Badge key={m.model} variant="outline" className="text-xs font-normal">
                {formatModelName(m.model)}
              </Badge>
            ))}
            {provider.models.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                +{provider.models.length - 3}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              {provider.responseTime && (
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {provider.responseTime}ms
                </span>
              )}
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {provider.models.length} 模型
              </span>
            </div>
            <div className="flex gap-1">
              {provider.tags.slice(0, 2).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          </div>

          {provider.freeQuota && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-emerald-600 font-medium">🎁 免费额度: ${provider.freeQuota.amount} {provider.freeQuota.unit}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
