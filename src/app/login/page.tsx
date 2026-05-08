"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert("登录功能即将上线");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-white font-bold text-lg">TA</span>
              </div>
            </div>
            <CardTitle className="text-xl">登录 Token Atlas</CardTitle>
            <p className="text-sm text-slate-500 mt-1">登录后可收藏商家、提交评价、获取价格变动通知</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">邮箱 / 用户名</label>
                <Input
                  type="text"
                  placeholder="请输入邮箱或用户名"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">密码</label>
                <Input
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" className="rounded" />
                  记住我
                </label>
                <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                  忘记密码?
                </a>
              </div>
              <Button type="submit" className="w-full h-10">
                登录
              </Button>
              <p className="text-center text-sm text-slate-500">
                还没有账号?{" "}
                <a href="#" className="text-blue-600 hover:underline" onClick={(e) => e.preventDefault()}>
                  立即注册
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
