import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BillingBadge } from "@/components/shared/BillingBadge";
import { Badge } from "@/components/ui/badge";
import { Provider } from "@/lib/types";
import { formatPrice } from "@/lib/format";

interface RecentProvidersProps {
  providers: Provider[];
}

export function RecentProviders({ providers }: RecentProvidersProps) {
  const recent = [...providers]
    .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
    .slice(0, 5);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">最新上架商家</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recent.map((provider) => (
            <Link
              key={provider.id}
              href={`/providers/${provider.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm group-hover:text-blue-600 transition-colors truncate">
                    {provider.name}
                  </span>
                  <StatusBadge status={provider.status} />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <BillingBadge type={provider.billingType} />
                  <span className="text-xs text-muted-foreground">
                    最低 {formatPrice(Math.min(...provider.models.map(m => m.inputPrice)))}/1M
                  </span>
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                {provider.tags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
