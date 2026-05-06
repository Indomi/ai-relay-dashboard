"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Store, Wifi, TrendingUp, DollarSign } from "lucide-react";
import { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "总商家数", value: stats.totalProviders, icon: Store, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "在线商家", value: stats.onlineProviders, icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "今日新增", value: stats.todayNew, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "最低价", value: `¥${stats.lowestPrice.price}/1M`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50", sub: stats.lowestPrice.model },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                {card.sub && <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>}
              </div>
              <div className={`p-2.5 rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
