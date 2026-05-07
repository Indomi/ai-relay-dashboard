"use client";
import { useState } from "react";
import { SmartRecommendPanel } from "./SmartRecommendPanel";
import { Provider } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export function SmartRecommendPanelWrapper({ providers }: { providers: Provider[] }) {
  const [recommendations, setRecommendations] = useState<Provider[]>([]);

  return (
    <div>
      {recommendations.length === 0 ? (
        <SmartRecommendPanel providers={providers} onRecommend={setRecommendations} />
      ) : (
        <div className="space-y-4">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4">🎯 根据你的需求推荐</h3>
              <div className="space-y-3">
                {recommendations.map((p, i) => {
                    const minPrice = p.models.length > 0
                      ? Math.min(...p.models.map((m) => m.inputPrice || 0), Infinity)
                      : Infinity;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                          </span>
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-slate-300">
                              {p.models.length} 个模型 ·{" "}
                              {minPrice < Infinity ? `¥${minPrice.toFixed(1)}/1M` : "价格待确认"}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/providers/${p.id}`}
                          className="text-sm bg-blue-600 px-3 py-1 rounded hover:bg-blue-500"
                        >
                          查看详情
                        </Link>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
          <button
            onClick={() => setRecommendations([])}
            className="w-full text-sm text-slate-500 hover:text-slate-700"
          >
            ← 重新选择
          </button>
        </div>
      )}
    </div>
  );
}
