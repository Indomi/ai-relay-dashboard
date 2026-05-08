"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SubmitPage() {
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    contact: "",
    models: "",
    priceInfo: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("提交成功，我们会在24小时内审核");
    setFormData({ name: "", website: "", contact: "", models: "", priceInfo: "", notes: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-slate-900">Token Atlas</Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/providers" className="text-slate-600 hover:text-slate-900">实时榜单</Link>
                <Link href="/providers?sort=price" className="text-slate-600 hover:text-slate-900">模型比价</Link>
                <Link href="/providers?type=subscription" className="text-slate-600 hover:text-slate-900">订阅方案</Link>
                <Link href="/risk" className="text-slate-600 hover:text-slate-900">风险雷达</Link>
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">返回首页</Link>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">提交商家</h1>
          <p className="text-slate-500 text-sm mt-1">提交一个新的 API 中转商家，帮助社区发现更多选择</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>商家信息</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  商家名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="例如：OpenRouter、API2D"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  网站 URL <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  联系方式
                </label>
                <Input
                  type="text"
                  placeholder="邮箱、Telegram、微信等"
                  value={formData.contact}
                  onChange={(e) => handleChange("contact", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  支持的模型
                </label>
                <Input
                  type="text"
                  placeholder="例如：GPT-4o, Claude 3.5, Gemini Pro（用逗号分隔）"
                  value={formData.models}
                  onChange={(e) => handleChange("models", e.target.value)}
                />
                <p className="text-xs text-slate-400">多个模型请用逗号分隔</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  价格信息
                </label>
                <textarea
                  className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                  rows={3}
                  placeholder="例如：GPT-4o 输入 $2/1M tokens，输出 $8/1M tokens"
                  value={formData.priceInfo}
                  onChange={(e) => handleChange("priceInfo", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  备注
                </label>
                <textarea
                  className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                  rows={3}
                  placeholder="其他需要补充的信息，如充值方式、免费额度、特色功能等"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-10">
                  提交商家信息
                </Button>
              </div>

              <p className="text-xs text-slate-400 text-center">
                提交后我们会在 24 小时内进行审核，审核通过后商家信息将展示在平台上
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
