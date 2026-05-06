import { Badge } from "@/components/ui/badge";

interface BillingBadgeProps {
  type: "token" | "subscription" | "hybrid";
}

const billingConfig = {
  token: { label: "按量计费", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  subscription: { label: "订阅制", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  hybrid: { label: "混合计费", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
};

export function BillingBadge({ type }: BillingBadgeProps) {
  const config = billingConfig[type];
  return (
    <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${config.className}`}>
      {config.label}
    </Badge>
  );
}
