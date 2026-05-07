import Link from "next/link";
import { ProviderFilterList } from "@/components/providers/ProviderFilterList";

export default function ProvidersPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-slate-900">
                Token Atlas
              </Link>
              <div className="hidden md:flex items-center gap-6 text-sm">
                <Link href="/providers" className="text-blue-600 font-medium">
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
              </div>
            </div>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              ← 返回首页
            </Link>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">商家与方案列表</h1>
              <p className="text-slate-500 text-sm mt-1">
                按你的预算、模型需求和风险偏好筛选
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 商家列表 - 客户端组件，从 API 获取数据 */}
      <ProviderFilterList />
    </div>
  );
}
