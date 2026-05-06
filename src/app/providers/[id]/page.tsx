import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BillingBadge } from "@/components/shared/BillingBadge";
import { getProviderById, getProviders } from "@/lib/data/providers";
import { formatPrice, formatModelName, formatRelativeTime, formatPlatformName, getPlatformColor } from "@/lib/format";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { PriceCompare } from "./PriceCompare";
import {
  Globe, MessageCircle, Clock, Zap, Shield, CreditCard, Tag, ArrowLeft, ExternalLink, Gift
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const provider = getProviderById(id);
  if (!provider) notFound();

  const allProviders = getProviders();
  const similarProviders = allProviders
    .filter(p => p.id !== provider.id && p.models.some(m => provider.models.some(pm => pm.model === pm.model)))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link href="/providers" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      {/* 基本信息 */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                <StatusBadge status={provider.status} />
                <BillingBadge type={provider.billingType} />
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{provider.website}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{provider.contact}</span>
                {provider.responseTime && (
                  <span className="flex items-center gap-1"><Zap className="h-4 w-4" />{provider.responseTime}ms</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />更新于 {formatRelativeTime(provider.lastUpdated)}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {provider.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />{tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" render={<a href={provider.website} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="h-4 w-4 mr-1" />访问官网
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* 模型价格表 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">模型价格</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">模型</th>
                      <th className="pb-2 font-medium text-right">输入价格</th>
                      <th className="pb-2 font-medium text-right">输出价格</th>
                      <th className="pb-2 font-medium text-right">单位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {provider.models.map(model => (
                      <tr key={model.model} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{formatModelName(model.model)}</td>
                        <td className="py-2.5 text-right text-blue-600 font-medium">{formatPrice(model.inputPrice)}</td>
                        <td className="py-2.5 text-right text-purple-600 font-medium">{formatPrice(model.outputPrice)}</td>
                        <td className="py-2.5 text-right text-muted-foreground">/1M tokens</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 订阅计划 */}
          {provider.subscription && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">订阅计划</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {provider.subscription.plans.map(plan => (
                    <div key={plan.name} className="p-4 rounded-xl border bg-gray-50/50">
                      <h4 className="font-semibold">{plan.name}</h4>
                      <p className="text-2xl font-bold text-blue-600 mt-1">¥{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span></p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="text-emerald-500">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 价格历史 */}
          {provider.priceHistory.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">价格趋势</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceHistoryChart history={provider.priceHistory} />
              </CardContent>
            </Card>
          )}

          {/* 同类商家对比 */}
          {similarProviders.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">同类商家价格对比</CardTitle>
              </CardHeader>
              <CardContent>
                <PriceCompare current={provider} similar={similarProviders} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          {/* 免费额度 */}
          {provider.freeQuota && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="h-4 w-4 text-emerald-600" />
                  <h3 className="font-semibold text-sm">免费额度</h3>
                </div>
                <p className="text-xl font-bold text-emerald-600">${provider.freeQuota.amount}</p>
                <p className="text-xs text-muted-foreground">{provider.freeQuota.unit}</p>
              </CardContent>
            </Card>
          )}

          {/* 支付方式 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">支付方式</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {provider.paymentMethods.map(m => (
                  <Badge key={m} variant="outline">{m}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 技术限制 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">技术限制</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">并发限制</span>
                  <span className="font-medium">{provider.concurrencyLimit || "无限制"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">速率限制</span>
                  <span className="font-medium">{provider.rateLimit || "无限制"}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">热度评分</span>
                  <span className="font-medium">{provider.heatScore}/100</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">被提及次数</span>
                  <span className="font-medium">{provider.mentionCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 来源帖子 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">来源帖子</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {provider.sources.map((source, i) => (
                  <a
                    key={i}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-xs ${getPlatformColor(source.platform)}`}>
                        {formatPlatformName(source.platform)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(source.publishedAt)}</span>
                    </div>
                    <p className="text-sm truncate group-hover:text-blue-600 transition-colors">{source.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">by {source.author}</p>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
