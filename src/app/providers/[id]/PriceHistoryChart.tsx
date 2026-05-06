"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceHistoryEntry } from "@/lib/types";

interface PriceHistoryChartProps {
  history: PriceHistoryEntry[];
}

export function PriceHistoryChart({ history }: PriceHistoryChartProps) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ left: 0, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `¥${v}`} />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            formatter={(value) => [`¥${value}/1M`, "价格"]}
          />
          <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
