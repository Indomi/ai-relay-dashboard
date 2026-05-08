"use client";
import { useState, useMemo, useEffect } from "react";
import { Provider } from "@/lib/types";
import { ProviderRowCard } from "@/components/home/ProviderRowCard";
import { ProviderListCard } from "@/components/home/ProviderListCard";

interface FilterState {
  type: string;
  model: string;
  minPrice: number;
  maxPrice: number;
  payment: string;
  refund: string;
  riskLevel: string;
  sort: string;
  tagFilter: string;
}

function getInitialFilters(initialParams?: { [key: string]: string | undefined }): FilterState {
  const base: FilterState = {
    type: "",
    model: "",
    minPrice: 0,
    maxPrice: 100,
    payment: "",
    refund: "",
    riskLevel: "",
    sort: "recommended",
    tagFilter: "",
  };

  if (!initialParams) return base;

  const { usage, region, sort, type } = initialParams;

  if (usage === "api") {
    base.sort = "price";
    base.type = "api";
  } else if (usage === "personal") {
    base.sort = "recommended";
    base.type = "subscription";
  } else if (usage === "team") {
    base.sort = "recommended";
  }

  if (region === "china") {
    base.tagFilter = "国内直连";
  }

  // 也支持直接传 sort 和 type 参数
  if (sort) base.sort = sort;
  if (type) base.type = type;

  return base;
}

function CompareModal({ providers, onClose }: { providers: Provider[]; onClose: () => void }) {
  if (providers.length === 0) return null;

  const billingTypeLabel = (type: string) => {
    switch (type) {
      case "token": return "按量计费";
      case "subscription": return "订阅制";
      case "hybrid": return "混合计费";
      default: return type;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "online": return "在线";
      case "offline": return "离线";
      default: return "未知";
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-600";
      case "offline": return "text-red-500";
      default: return "text-slate-400";
    }
  };

  const rows: { label: string; getValue: (p: Provider) => React.ReactNode }[] = [
    {
      label: "网站",
      getValue: (p) => (
        <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
          {p.website}
        </a>
      ),
    },
    {
      label: "计费方式",
      getValue: (p) => billingTypeLabel(p.billingType),
    },
    {
      label: "支持模型数",
      getValue: (p) => p.models.length,
    },
    {
      label: "最低输入价格",
      getValue: (p) => {
        if (p.models.length === 0) return "-";
        const min = Math.min(...p.models.map((m) => m.inputPrice || Infinity));
        return min === Infinity ? "-" : `${min} ${p.models[0]?.currency || ""}/1M tokens`;
      },
    },
    {
      label: "最低输出价格",
      getValue: (p) => {
        if (p.models.length === 0) return "-";
        const min = Math.min(...p.models.map((m) => m.outputPrice || Infinity));
        return min === Infinity ? "-" : `${min} ${p.models[0]?.currency || ""}/1M tokens`;
      },
    },
    {
      label: "热度评分",
      getValue: (p) => (
        <span className="font-medium">{p.heatScore ?? "-"}</span>
      ),
    },
    {
      label: "被提及次数",
      getValue: (p) => p.mentionCount ?? "-",
    },
    {
      label: "状态",
      getValue: (p) => (
        <span className={statusColor(p.status)}>{statusLabel(p.status)}</span>
      ),
    },
    {
      label: "来源数",
      getValue: (p) => p.sources.length,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 模态框内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-5xl max-h-[85vh] flex flex-col mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold text-slate-900">商家对比</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* 表格区域 - 可滚动 */}
        <div className="overflow-auto flex-1 px-6 py-4">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-sm font-medium text-slate-500 p-3 border-b w-32 sticky left-0 bg-white z-10">
                  对比维度
                </th>
                {providers.map((p) => (
                  <th key={p.id} className="text-left p-3 border-b min-w-[180px]">
                    <div className="font-bold text-slate-900">{p.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.label} className={idx % 2 === 0 ? "bg-slate-50/50" : ""}>
                  <td className="text-sm font-medium text-slate-600 p-3 border-b sticky left-0 z-10 bg-inherit">
                    {row.label}
                  </td>
                  {providers.map((p) => (
                    <td key={p.id} className="text-sm text-slate-800 p-3 border-b">
                      {row.getValue(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompareBar({ selected, onClear, onCompare }: { selected: Provider[]; onClear: () => void; onCompare: () => void }) {
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
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClear} className="text-slate-500 hover:text-slate-700 text-sm">清空</button>
          <button onClick={onCompare} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-500">开始对比</button>
        </div>
      </div>
    </div>
  );
}

export function ProviderFilterList({ initialParams }: { initialParams?: { [key: string]: string | undefined } }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => getInitialFilters(initialParams));

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

    if (filters.type === "api") {
      result = result.filter((p) => p.billingType === "token");
    } else if (filters.type === "subscription") {
      result = result.filter((p) => p.billingType === "subscription");
    }

    if (filters.model) {
      result = result.filter((p) =>
        p.models.some((m) => m.model.toLowerCase().includes(filters.model.toLowerCase()))
      );
    }

    if (filters.tagFilter) {
      result = result.filter((p) =>
        p.tags.some((t) => t.includes(filters.tagFilter))
      );
    }

    result = result.filter((p) => {
      if (p.models.length === 0) return true;
      const minPrice = Math.min(...p.models.map((m) => m.inputPrice || 0));
      return minPrice >= filters.minPrice && minPrice <= filters.maxPrice;
    });

    if (filters.sort === "price") {
      result.sort((a, b) => {
        const aMin = Math.min(...a.models.map((m) => m.inputPrice || 0), Infinity);
        const bMin = Math.min(...b.models.map((m) => m.inputPrice || 0), Infinity);
        return aMin - bMin;
      });
    } else if (filters.sort === "heat") {
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
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50">
              <span>🔍</span><span>筛选</span>
            </button>

            <select
              value={filters.sort}
              onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
              className="px-4 py-2 border rounded-lg bg-white"
            >
              <option value="recommended">综合推荐</option>
              <option value="price">最低价</option>
              <option value="heat">最稳定</option>
            </select>

            <button
              onClick={() => setFilters((f) => ({ ...f, model: f.model === "claude" ? "" : "claude" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${filters.model === "claude" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
            >
              Claude
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, model: f.model === "gpt" ? "" : "gpt" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${filters.model === "gpt" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
            >
              GPT
            </button>
            <button
              onClick={() => setFilters((f) => ({ ...f, type: f.type === "subscription" ? "" : "subscription" }))}
              className={`px-3 py-1.5 rounded-full text-sm ${filters.type === "subscription" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
            >
              订阅
            </button>

            {(filters.model || filters.type || filters.sort !== "recommended" || filters.tagFilter) && (
              <button
                onClick={() => setFilters({ type: "", model: "", minPrice: 0, maxPrice: 100, payment: "", refund: "", riskLevel: "", sort: "recommended", tagFilter: "" })}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                重置筛选
              </button>
            )}

            <div className="ml-auto text-sm text-slate-500">
              共 {filteredProviders.length} 个方案
            </div>
          </div>
        </div>
      </div>

      {/* 商家列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredProviders.length > 0 ? (
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
        ) : (
          <div className="text-center py-20 text-slate-500">
            <p className="text-lg mb-2">没有找到符合条件的方案</p>
            <button
              onClick={() => setFilters({ type: "", model: "", minPrice: 0, maxPrice: 100, payment: "", refund: "", riskLevel: "", sort: "recommended", tagFilter: "" })}
              className="text-blue-600 hover:underline"
            >
              重置筛选条件
            </button>
          </div>
        )}
      </div>

      <CompareBar
        selected={selectedProviders}
        onClear={() => setSelectedForCompare([])}
        onCompare={() => setShowCompareModal(true)}
      />

      {showCompareModal && (
        <CompareModal
          providers={selectedProviders}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
}
