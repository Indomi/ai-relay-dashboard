"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">平台原则</h1>
          <p className="text-slate-500 text-sm mt-1">了解 Token Atlas 的理念、规则与承诺</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 使命 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">🎯</span> 我们的使命
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Token Atlas 致力于为 AI 开发者和用户提供透明、客观的 API 中转服务比价平台。
              我们相信信息透明是做出正确决策的基础，尤其在 AI API 市场快速发展的今天，
              用户需要一个可信赖的参考来源。
            </p>
            <p>
              我们不收取任何商家的推广费用，所有排名和评分均基于客观数据和社区反馈。
              这确保了平台的中立性和公正性。
            </p>
          </CardContent>
        </Card>

        {/* 数据来源 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">📊</span> 数据来源说明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>我们的数据来自以下渠道：</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>社区讨论</strong>：V2EX、NodeSeek、Linux.do 等技术社区的公开讨论</li>
              <li><strong>社交媒体</strong>：小红书、即刻、知乎、Telegram 等平台的用户分享</li>
              <li><strong>技术博客</strong>：掘金等开发者社区的技术文章</li>
              <li><strong>RSS 订阅</strong>：各平台 RSS 源的自动抓取</li>
              <li><strong>全网搜索</strong>：基于搜索引擎的补充数据</li>
              <li><strong>商家自提交</strong>：商家通过平台提交的信息（会标注来源）</li>
            </ul>
            <p>
              所有数据均经过 AI 自动提取和去重处理，确保信息的准确性和时效性。
              数据来源页面可查看各渠道的启用状态和最后抓取时间。
            </p>
          </CardContent>
        </Card>

        {/* 评分规则 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">⭐</span> 评分规则
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>商家的热度评分和风险等级基于以下因素综合计算：</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 shrink-0">热度</Badge>
                <span>基于社区讨论量、搜索频次和用户关注度综合计算，反映商家的市场热度</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 shrink-0">风险</Badge>
                <span>基于商家运行状态、社区负面反馈标签（如"跑路"、"不稳定"等）综合评估</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 shrink-0">价格</Badge>
                <span>各模型的输入/输出价格直接展示，支持按模型横向比价</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 shrink-0">状态</Badge>
                <span>定期检测商家 API 可用性和响应时间，实时展示在线/离线状态</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 免责声明 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">⚖️</span> 免责声明
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Token Atlas 仅提供信息聚合和展示服务，不构成任何投资或消费建议。
              平台上的所有信息（包括价格、状态、评价等）均来自公开渠道或用户提交，
              我们尽力确保数据的准确性，但不对数据的完整性和时效性做出保证。
            </p>
            <p>用户在使用任何 API 中转服务前，应自行评估风险并做出独立判断。</p>
            <p>
              平台不参与任何商家的运营，不收取推广费用，不承担因使用商家服务而产生的任何损失。
              如发现商家存在欺诈行为，请通过联系我们页面进行反馈。
            </p>
          </CardContent>
        </Card>

        {/* 团队信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-lg">👥</span> 关于团队
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 leading-relaxed space-y-3">
            <p>
              Token Atlas 由一群热爱 AI 和开源的开发者维护。我们深知选择可靠的 API 服务
              对开发者的重要性，因此创建了这个平台来帮助社区做出更好的决策。
            </p>
            <p>
              项目完全开源，欢迎社区贡献。如果你有任何建议或发现数据问题，
              可以通过 GitHub 提交 Issue 或 PR。
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/contact"
                className="text-blue-600 hover:underline text-sm"
              >
                联系我们
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/sources"
                className="text-blue-600 hover:underline text-sm"
              >
                数据来源
              </Link>
              <span className="text-slate-300">|</span>
              <Link
                href="/submit"
                className="text-blue-600 hover:underline text-sm"
              >
                提交商家
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
