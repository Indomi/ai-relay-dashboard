"use client";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Provider } from "@/lib/types";
import { formatModelName } from "@/lib/format";

interface PriceChartProps {
  providers: Provider[];
}

export function PriceChart({ providers }: PriceChartProps) {
  const data = providers.map(p => ({
    name: p.name,
    minPrice: Math.min(...p.models.map(m => m.inputPrice)),
    modelCount: p.models.length,
    status: p.status,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">价格分布</CardTitle>
        <p className="text-xs text-muted-foreground">横轴: 最低输入价格(¥/1M tokens) · 纵轴: 支持模型数</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" dataKey="minPrice" name="最低价" unit="¥" tick={{ fontSize: 12 }} />
              <YAxis type="number" dataKey="modelCount" name="模型数" tick={{ fontSize: 12 }} />
              <ZAxis range={[60, 200]} />
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((value: any, name: string) => {
                  if (name === "最低价") return [`¥${value}/1M`, name];
                  return [value, name];
                }) as never}
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    const d = payload[0].payload;
                    return d.name;
                  }
                  return "";
                }}
              />
              <Scatter data={data} fill="#3b82f6" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
