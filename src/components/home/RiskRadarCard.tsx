import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskRadarCardProps {
  title: string;
  description: string;
  level: "high" | "medium" | "low" | "unknown";
}

export function RiskRadarCard({ title, description, level }: RiskRadarCardProps) {
  const levelConfig = {
    high: { label: "高风险", color: "bg-red-100 text-red-700", dot: "🟢" },
    medium: { label: "中等", color: "bg-amber-100 text-amber-700", dot: "🟡" },
    low: { label: "低风险", color: "bg-emerald-100 text-emerald-700", dot: "🔵" },
    unknown: { label: "未知", color: "bg-gray-100 text-gray-600", dot: "⚪" },
  };

  const config = levelConfig[level];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${config.color}`}>
            {config.label}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}
