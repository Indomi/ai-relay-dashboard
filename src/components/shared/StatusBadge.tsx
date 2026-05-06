import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "online" | "offline" | "unknown";
}

const statusConfig = {
  online: { label: "在线", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  offline: { label: "离线", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  unknown: { label: "未知", className: "bg-gray-100 text-gray-600 hover:bg-gray-100" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
