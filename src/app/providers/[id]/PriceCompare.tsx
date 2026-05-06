"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Provider } from "@/lib/types";
import { formatModelName } from "@/lib/format";

interface PriceCompareProps {
  current: Provider;
  similar: Provider[];
}

export function PriceCompare({ current, similar }: PriceCompareProps) {
  const commonModels = current.models
    .map(m => m.model)
    .filter(model => similar.some(p => p.models.some(pm => pm.model === model)));

  if (commonModels.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无同类商家对比数据</p>;
  }

  const data = commonModels.slice(0, 5).map(model => {
    const entry: Record<string, string | number> = { model: formatModelName(model) };
    entry[current.name] = current.models.find(m => m.model === model)?.inputPrice || 0;
    similar.forEach(p => {
      const price = p.models.find(m => m.model === model)?.inputPrice;
      if (price !== undefined) entry[p.name] = price;
    });
    return entry;
  });

  const allNames = [current.name, ...similar.map(p => p.name)];
  const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef"];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="model" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(value) => [`¥${value}/1M`, ""]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
          {allNames.map((name, i) => (
            <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} barSize={16} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
