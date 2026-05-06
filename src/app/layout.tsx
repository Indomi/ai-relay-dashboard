import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI中转商大盘",
  description: "全网AI中转商信息聚合平台，打破信息茧房",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50/50">
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
                <span className="text-xl">🤖</span>
                <span>AI中转商大盘</span>
              </Link>
              <nav className="flex items-center gap-6 text-sm">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  首页
                </Link>
                <Link href="/providers" className="text-muted-foreground hover:text-foreground transition-colors">
                  商家列表
                </Link>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  GitHub
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          <div className="max-w-7xl mx-auto px-4">
            <p>AI中转商大盘 — 全网AI中转商信息聚合平台 · 数据仅供参考</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
