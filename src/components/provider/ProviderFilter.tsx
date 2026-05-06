"use client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface ProviderFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  billingType: string;
  onBillingTypeChange: (value: string | null) => void;
  status: string;
  onStatusChange: (value: string | null) => void;
  sortBy: string;
  onSortByChange: (value: string | null) => void;
}

export function ProviderFilter({
  search, onSearchChange,
  billingType, onBillingTypeChange,
  status, onStatusChange,
  sortBy, onSortByChange,
}: ProviderFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索商家名称、模型..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 border-0 shadow-sm bg-white"
        />
      </div>
      <Select value={billingType} onValueChange={onBillingTypeChange}>
        <SelectTrigger className="w-[140px] border-0 shadow-sm bg-white">
          <SelectValue placeholder="计费方式" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部计费</SelectItem>
          <SelectItem value="token">按量计费</SelectItem>
          <SelectItem value="subscription">订阅制</SelectItem>
          <SelectItem value="hybrid">混合计费</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[120px] border-0 shadow-sm bg-white">
          <SelectValue placeholder="状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="online">在线</SelectItem>
          <SelectItem value="offline">离线</SelectItem>
          <SelectItem value="unknown">未知</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={onSortByChange}>
        <SelectTrigger className="w-[140px] border-0 shadow-sm bg-white">
          <SelectValue placeholder="排序" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="heat">热度优先</SelectItem>
          <SelectItem value="price-asc">价格升序</SelectItem>
          <SelectItem value="price-desc">价格降序</SelectItem>
          <SelectItem value="newest">最新上架</SelectItem>
          <SelectItem value="response">响应速度</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
