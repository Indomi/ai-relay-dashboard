# AI中转商可视化大盘

全网AI中转商信息聚合平台，自动收集各大社区的AI中转服务商信息，打破信息茧房。

## 功能特性

### 可视化大盘
- 📊 统计概览：总商家数、在线商家、今日新增、最低价
- 📈 模型覆盖：各模型被多少商家支持
- 💰 价格分布：商家价格与模型数量散点图
- 📰 社区动态：最新抓取的热门帖子
- 📉 每日趋势：新增商家和价格变动趋势

### 商家列表
- 🔍 搜索：支持商家名称、模型、标签搜索
- 🏷️ 筛选：按计费方式（按量/订阅/混合）、在线状态筛选
- 📊 排序：热度、价格、上架时间、响应速度
- 🃏 卡片展示：核心信息一目了然

### 商家详情
- 📋 完整信息：模型价格、订阅计划、免费额度、支付方式
- 📊 价格趋势：历史价格变动图表
- 📈 价格对比：与同类商家横向对比
- 🔗 来源追踪：社区原帖链接

## 技术栈

- **前端**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **图表**: Recharts
- **爬虫**: Crawlee + Cheerio
- **AI提取**: DeepSeek API
- **调度**: node-cron

## 项目结构

```
ai-relay-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页大盘
│   │   ├── providers/
│   │   │   ├── page.tsx        # 商家列表
│   │   │   └── [id]/page.tsx   # 商家详情
│   │   └── layout.tsx          # 根布局
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 组件
│   │   ├── dashboard/          # 大盘组件
│   │   ├── provider/           # 商家相关组件
│   │   └── shared/             # 共享组件
│   └── lib/
│       ├── types/              # TypeScript 类型
│       ├── data/               # 数据读取
│       └── format.ts           # 格式化工具
├── crawler/                    # 爬虫系统
│   ├── src/
│   │   ├── extractors/         # 各社区爬虫
│   │   │   ├── v2ex.ts
│   │   │   ├── nodeseek.ts
│   │   │   └── linuxdo.ts
│   │   ├── ai-extractor.ts     # AI结构化提取
│   │   ├── deduplicator.ts     # 去重合并
│   │   ├── scheduler.ts        # 爬虫调度器
│   │   ├── config.ts           # 爬虫配置
│   │   └── types.ts            # 爬虫类型
│   └── run.ts                  # 爬虫运行脚本
├── data/
│   ├── providers.json          # 商家数据
│   └── stats.json              # 统计数据
└── package.json
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### 运行爬虫

```bash
# 运行所有爬虫
npx tsx crawler/run.ts

# 运行指定爬虫
npx tsx crawler/run.ts v2ex
```

### 生产构建

```bash
npm run build
npm start
```

## 爬虫系统

### 支持的社区

| 社区 | 状态 | 频率 |
|------|------|------|
| V2EX | ✅ 模拟数据 | 每2小时 |
| NodeSeek | ✅ 模拟数据 | 每2小时 |
| Linux.do | ✅ 模拟数据 | 每3小时 |
| 即刻 | ⏸️ 待实现 | - |
| 知乎 | ⏸️ 待实现 | - |
| 小红书 | ⏸️ 待实现 | - |
| Telegram | ⏸️ 待实现 | - |

### AI提取配置

设置环境变量：

```bash
export DEEPSEEK_API_KEY="your-api-key"
```

### 爬虫架构

```
社区帖子 → 爬虫抓取 → AI提取 → 去重合并 → 更新数据 → 大盘刷新
```

## 数据模型

### Provider（商家）

```typescript
interface Provider {
  id: string;
  name: string;
  website: string;
  contact: string;
  models: ModelPricing[];
  billingType: "token" | "subscription" | "hybrid";
  subscription?: { plans: SubscriptionPlan[] };
  freeQuota?: { amount: number; unit: string };
  paymentMethods: string[];
  status: "online" | "offline" | "unknown";
  heatScore: number;
  mentionCount: number;
  sources: Source[];
  tags: string[];
}
```

## 后续计划

- [ ] 实现真实社区爬虫（V2EX、NodeSeek、Linux.do）
- [ ] 添加更多社区（即刻、知乎、小红书、Telegram）
- [ ] API在线检测功能
- [ ] 价格变动通知
- [ ] 用户评价系统
- [ ] 商家入驻申请

## License

MIT
