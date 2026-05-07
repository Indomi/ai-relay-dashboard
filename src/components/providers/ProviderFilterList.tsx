"use client";
import { useState, useMemo, useEffect } from "react";
import { Provider } from "@/lib/types";
import { ProviderRowCard } from "@/components/home/ProviderRowCard";
import { ProviderListCard } from "@/components/home/ProviderListCard";

interface FilterState {
  type: string; // api, subscription, mixed
  model: string; // openai, claude, gemini, deepseek, multi
  minPrice: number;
  maxPrice: number;
  payment: string; // alipay, wechat, card, usdt
  refund: string; // yes, partial, no
  riskLevel: string; // high, medium, low
  sort: string; // recommended, price, heat, risk
}

interface CompareBarProps {
  selected: Provider[];
  onClear: () => void;
  onCompare: () => void;
}

function CompareBar({ selected, onClear, onCompare }: CompareBarProps) {
  if (selected.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-slate-600">已选择</span>
          <div className="flex gap-2">
            {selected.slice(0, 3).map((p) => (
              <span key={p.id} className="bg-slate-100 px-3 py-1 rounded-full text-sm">
                {p.name}
              </span>
            ))}
            {selected.length > 3 && (
              <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">
                +{selected.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClear}
            className="text-slate-500 hover:text-slate-700 text-sm"
          >
            清空
          </button>
          <button
            onClick={onCompare}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500"
          >
            开始对比
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProviderFilterList({ allProviders }: { allProviders: Provider[] }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    type: "",
    model: "",
    minPrice: 0,
    maxPrice: 100,
    payment: "",
    refund: "",
    riskLevel: "",
    sort: "recommended",
  });

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProviders(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredProviders = useMemo(() => {
    let result = [...providers];

    // 按类型过滤
    if (filters.type === "api") {
      result = result.filter((p) => p.billingType === "token");
    } else if (filters.type === "subscription") {
      result = result.filter((p) => p.billingType === "subscription");
    }

    // 按模型过滤
    if (filters.model) {
      result = result.filter((p) =>
        p.models.some((m) =>
          m.model.toLowerCase().includes(filters.model)
        )
      );
    }

    // 按价格过滤
    result = result.filter((p) => {
      const minPrice = Math.min(...p.models.map((m) => m.inputPrice || 0), Infinity);
      return minPrice >= filters.minPrice && minPrice <= filters.maxPrice;
    });

    // 按排序
    if (filters.sort === "price") {
      result.sort((a, b) => {
        const aMin = Math.min(...a.models.map((m) => m.inputPrice || 0), Infinity);
        const bMin = Math.min(...b.models.map((m) => m.inputPrice || 0), Infinity);
        return aMin - bMin;
      });
    } else if (filters.sort === "heat") {
      result.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0));
    } else if (filters.sort === "risk") {
      result.sort((a, b) => (a.heatScore || 0) - (b.heatScore || 0));
    } else {
      // recommended - 默认按热度
      result.sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0));
    }

    return result;
  }, [providers, filters]);

  const toggleCompare = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id].slice(0, 5)
    );
  };

  const selectedProviders = providers.filter((p) => selectedForCompare.includes(p.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* 筛选栏 */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 快速筛选标签 */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50"
            >
              <span>🔍</span>
              <span>筛选</span>
            </button>

            {/* 排序 */}
            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="recommended">综合推荐</option>
              <option value="price">最低价</option>
              <option value="heat">最稳定</option>
              <option value="risk">风险最低</option>
            </select>

            {/* 快速标签 */}
            <button
              onClick={() => setFilters((f) => ({ ...f, model: "claude" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${
                filters.model === "claude"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              Claude
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, model: "gpt" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${
                filters.model === "gpt"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              GPT
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, type: "subscription" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${
                filters.type === "subscription"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              订阅
            </button>

            {/* 重置 */}
            {(filters.model || filters.type || filters.sort !== "recommended") && (
              <button
                onClick={() =>
                  setFilters({
                    type: "",
                    model: "",
                    minPrice: 0,
                    maxPrice: 100,
                    payment: "",
                    refund: "",
                    riskLevel: "",
                    sort: "recommended",
                  })
                }
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                重置筛选
              </button>
            )}

            <div className="ml-auto text-sm text-slate-500">
              共 {filteredProviders.length} 个方案
            </div>
          </div>

          {/* 展开筛选面板 */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
              <FilterSelect
                label="购买类型"
                value={filters.type}
                onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                options={[
                  { value: "", label: "全部" },
                  { value: "api", label: "API 订阅" },
                  { value: "subscription", label: "会员订阅" },
                ]}
              />
              <FilterSelect
                label="目标模型"
                value={filters.model}
                onChange={(v) => setFilters((f) => ({ ...f, model: v }))}
                options={[
                  { value: "", label: "全部" },
                  { value: "gpt", label: "OpenAI" },
                  { value: "claude", label: "Claude" },
                  { value: "gemini", label: "Gemini" },
                ]}
              />
              <FilterSelect
                label="退款支持"
                value={filters.refund}
                onChange={(v) => setFilters((f) => ({ ...f, refund: v }))}
                options={[
                  { value: "", label: "全部" },
                  { value: "yes", label: "支持退款" },
                  { value: "partial", label: "条件支持" },
                  { value: "no", label: "不支持" },
                ]}
              />
              <FilterSelect
                label="风险透明度"
                value={filters.riskLevel}
                onChange={(v) => setFilters((f) => ({ ...f, riskLevel: v }))}
                options={[
                  { value: "", label: "全部" },
                  { value: "high", label: "高" },
                  { value: "medium", label: "中" },
                  { value: "low", label: "低" },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* 商家列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-3">
          {filteredProviders.map((provider) => (
            <div key={provider.id} className="relative">
              <ProviderRowCard provider={provider} />
              <button
                onClick={() => toggleCompare(provider.id)}
                className={`absolute top-4 right-4 px-3 py-1 rounded text-sm border transition-colors ${
                  selectedForCompare.includes(provider.id)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-300"
                }`}
              >
                {selectedForCompare.includes(provider.id) ? "✓ 已选择" : "加入对比"}
              </button>
            </div>
          ))}
        </div>

        {filteredProviders.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-2">没有找到符合条件的方案</p>
            <button
              onClick={() =>
                setFilters({
                  type: "",
                  model: "",
                  minPrice: 0,
                  maxPrice: 100,
                  payment: "",
                  refund: "",
                  riskLevel: "",
                  sort: "recommended",
                })
              }
              className="text-blue-600 hover:underline"
            >
              重置筛选条件
            </button>
          </div>
        )}
      </div>

      {/* 对比浮层 */}
      <CompareBar
        selected={selectedProviders}
        onClear={() => setSelectedForCompare([])}
        onCompare={() => {
          alert("对比功能开发中...");
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
