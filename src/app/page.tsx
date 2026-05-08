import Link from "next/link";
import { getProviders, getStats } from "@/lib/data/providers-db";
import { SmartRecommendPanelWrapper } from "@/components/home/SmartRecommendPanelWrapper";
import { ProviderRowCard } from "@/components/home/ProviderRowCard";

export default async function HomePage() {
  const stats = await getStats();
  const providers = await getProviders();

  // 获取热门商家
  const hotProviders = [...providers]
    .sort((a, b) => (b.heatScore || 0) - (a.heatScore || 0))
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-bold text-slate-900">
                Token Atlas
              </h1>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/providers" className="text-slate-600 hover:text-slate-900">
                  实时榜单
                </Link>
                <Link href="/providers?sort=price" className="text-slate-600 hover:text-slate-900">
                  模型比价
                </Link>
                <Link href="/providers?type=subscription" className="text-slate-600 hover:text-slate-900">
                  订阅方案
                </Link>
                <Link href="/risk" className="text-slate-600 hover:text-slate-900">
                  风险雷达
                </Link>
                <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                  数据大盘
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5">
                登录
              </Link>
              <Link href="/providers" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium">
                开始选购
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* 左侧文案 */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                打破信息茧房，
                <br />
                <span className="text-blue-600">买到真正适合你的</span>
                <br />
                AI Token / 订阅
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed">
                聚合官方渠道与中转商，按价格、稳定性、额度、模型支持、
                支付方式、退款政策与风险透明度进行对比。
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="#recommend" className="bg-blue-600 hover:bg-blue-500 text-white text-base px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
                🎯 开始智能推荐
              </Link>
              <Link href="/providers" className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-base px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2">
                📊 查看实时榜单
              </Link>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">{stats.totalProviders}</span> 个渠道
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">{stats.modelCoverage.length}</span> 种模型
              </span>
              <span className="flex items-center gap-1">
                <span className="font-semibold text-slate-700">实时</span> 更新中
              </span>
            </div>
          </div>

          {/* 右侧推荐面板 */}
          <div id="recommend">
            <SmartRecommendPanelWrapper providers={providers} />
          </div>
        </div>
      </section>

      {/* 快速入口区 */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            按你的场景开始
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ScenarioCard
              emoji="👨‍💻"
              title="开发者接 API"
              description="关注模型兼容、价格、延迟和并发"
              href="/providers?usage=api"
            />
            <ScenarioCard
              emoji="🤖"
              title="个人重度对话"
              description="关注订阅成本、封号风险和使用门槛"
              href="/providers?usage=personal"
            />
            <ScenarioCard
              emoji="🏢"
              title="企业团队采购"
              description="关注发票、稳定性、权限管理和售后"
              href="/providers?usage=team"
            />
            <ScenarioCard
              emoji="🇨🇳"
              title="国内直连替代方案"
              description="关注可访问性、支付方式和风控透明度"
              href="/providers?region=china"
            />
          </div>
        </div>
      </section>

      {/* 实时榜单 */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">实时比价榜</h2>
              <p className="text-slate-500 text-sm">不是只看最低价，而是看"适不适合你"</p>
            </div>
            <Link href="/providers" className="border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm px-4 py-2 rounded-lg font-medium inline-flex items-center">
                查看全部 →
              </Link>
          </div>

          {/* 榜单标签切换 */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <TabButton active label="最省钱" href="/providers?sort=price" />
            <TabButton active={false} label="最稳定" href="/providers?sort=heat" />
            <TabButton active={false} label="综合最优" href="/providers?sort=recommended" />
            <TabButton active={false} label="支持 Claude" href="/providers?model=claude" />
            <TabButton active={false} label="支持订阅" href="/providers?type=subscription" />
          </div>

          {/* 商家列表 */}
          <div className="space-y-3">
            {hotProviders.slice(0, 5).map((provider) => (
              <ProviderRowCard key={provider.id} provider={provider} />
            ))}
          </div>
        </div>
      </section>

      {/* 风险雷达预告 */}
      <section className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-2">别只看价格，也要看代价</h2>
          <p className="text-slate-400 mb-8">我们帮你看清风险再下单</p>

          <div className="grid md:grid-cols-3 gap-6">
            <RiskPreviewCard
              emoji="💳"
              title="隐藏费用"
              description="是否有最低充值门槛、手续费、汇率损耗"
            />
            <RiskPreviewCard
              emoji="⚠️"
              title="封号 / 风控风险"
              description="账号来源是否清晰，是否存在异常共享行为"
            />
            <RiskPreviewCard
              emoji="🔄"
              title="售后与退款"
              description="是否支持退款、退款条件是否明确、客服是否可联系"
            />
          </div>
        </div>
      </section>

      {/* 数据说明 */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            为什么你可以相信这些数据
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <DataSourceCard
              number="01"
              title="公开来源采集"
              description="价格、模型、支付方式来自官网与公开页面交叉采集"
            />
            <DataSourceCard
              number="02"
              title="规则化评分"
              description="风险与透明度评分基于规则，不接受商家自报直接加分"
            />
            <DataSourceCard
              number="03"
              title="可追溯更新"
              description="每条商家信息展示更新时间与来源链接"
            />
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-6 text-sm text-slate-500 justify-center">
            <Link href="/about" className="hover:text-slate-700">平台原则</Link>
            <Link href="/sources" className="hover:text-slate-700">数据来源</Link>
            <Link href="/risk" className="hover:text-slate-700">风险声明</Link>
            <Link href="/submit" className="hover:text-slate-700">提交商家</Link>
            <Link href="/contact" className="hover:text-slate-700">联系我们</Link>
          </div>
          <p className="text-center text-sm text-slate-400 mt-4">
            © 2024 Token Atlas · AI Token 与订阅透明选购平台
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  label,
  href,
}: {
  active: boolean;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function ScenarioCard({
  emoji,
  title,
  description,
  href,
}: {
  emoji: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-4 rounded-xl border hover:border-blue-300 hover:shadow-md transition-all bg-white"
    >
      <span className="text-2xl mb-2 block">{emoji}</span>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </Link>
  );
}

function RiskPreviewCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-slate-800">
      <span className="text-3xl mb-3 block">{emoji}</span>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}

function DataSourceCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="text-4xl font-bold text-blue-100">{number}</span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
    </div>
  );
}
