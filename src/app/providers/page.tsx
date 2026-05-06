"use client";
import { useState, useMemo } from "react";
import { ProviderCard } from "@/components/provider/ProviderCard";
import { ProviderFilter } from "@/components/provider/ProviderFilter";
import providersData from "../../../data/providers.json";
import { Provider } from "@/lib/types";

// 直接导入数据（构建时嵌入）
const allProviders: Provider[] = providersData as Provider[];

export default function ProvidersPage() {
  const [search, setSearch] = useState("");
  const [billingType, setBillingType] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("heat");

  const filtered = useMemo(() => {
    let result = [...allProviders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.models.some((m) => m.model.toLowerCase().includes(q)) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (billingType !== "all") {
      result = result.filter((p) => p.billingType === billingType);
    }
    if (status !== "all") {
      result = result.filter((p) => p.status === status);
    }

    switch (sortBy) {
      case "price-asc":
        result.sort(
          (a, b) =>
            Math.min(...a.models.map((m) => m.inputPrice)) -
            Math.min(...b.models.map((m) => m.inputPrice))
        );
        break;
      case "price-desc":
        result.sort(
          (a, b) =>
            Math.min(...b.models.map((m) => m.inputPrice)) -
            Math.min(...a.models.map((m) => m.inputPrice))
        );
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime()
        );
        break;
      case "response":
        result.sort(
          (a, b) => (a.responseTime || 9999) - (b.responseTime || 9999)
        );
        break;
      default:
        result.sort((a, b) => b.heatScore - a.heatScore);
    }

    return result;
  }, [search, billingType, status, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">商家列表</h1>
        <p className="text-muted-foreground text-sm mt-1">
          共 {filtered.length} 个商家
          {search && ` · 搜索 "${search}"`}
        </p>
      </div>

      <ProviderFilter
        search={search}
        onSearchChange={setSearch}
        billingType={billingType}
        onBillingTypeChange={(v) => setBillingType(v ?? "all")}
        status={status}
        onStatusChange={(v) => setStatus(v ?? "all")}
        sortBy={sortBy}
        onSortByChange={(v) => setSortBy(v ?? "heat")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {filtered.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">没有找到匹配的商家</p>
          <p className="text-sm mt-1">试试调整筛选条件</p>
        </div>
      )}
    </div>
  );
}
