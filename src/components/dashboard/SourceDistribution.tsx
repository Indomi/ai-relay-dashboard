"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stats } from "@/lib/types";
import { formatPlatformName } from "@/lib/format";

interface SourceDistributionProps {
  stats: Stats;
}

const COLORS = ["#6b7280", "#3b82f6", "#6366f1", "#eab308", "#2563eb", "#ef4444", "#0ea5e9", "#374151"];

export function SourceDistribution({ stats }: SourceDistributionProps) {
  const data = stats.sourceDistribution.map(s => ({
    name: formatPlatformName(s.platform),
    value: s.count,
  }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">信息来源分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                formatter={(value: unknown) => [`${value} 条`, "帖子数"]}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
