# GitHub Actions 部署指南

## 1. 创建 GitHub 仓库

将代码推送到 GitHub 仓库：

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-relay-dashboard.git
git push -u origin main
```

## 2. 配置 Secrets（重要！保护 API Key）

进入仓库 **Settings → Secrets and variables → Actions**，添加以下 secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `AI_API_KEY` | `tp-c8nzsys7uh8sw2i2p5u5h0l9q0d0z2k1ovx85q1s912qy91j` | AI API Key |
| `AI_BASE_URL` | `https://token-plan-cn.xiaomimimo.com/v1` | API 基础 URL |
| `AI_MODEL` | `mimo-v2.5` | 模型名称 |

### 添加 Secret 步骤：
1. 点击 **New repository secret**
2. Name 填入 `AI_API_KEY`
3. Secret 填入你的 API Key
4. 点击 **Add secret**
5. 重复上述步骤添加 `AI_BASE_URL` 和 `AI_MODEL`

## 3. 启用 GitHub Pages

1. 进入仓库 **Settings → Pages**
2. Source 选择 **GitHub Actions**

## 4. 配置爬虫定时任务

爬虫工作流已配置为每2小时自动运行一次。如需修改：

编辑 `.github/workflows/crawler.yml`：
```yaml
on:
  schedule:
    - cron: '0 */2 * * *'  # 每2小时
```

Cron 表达式参考：
- `0 */2 * * *` - 每2小时
- `0 */6 * * *` - 每6小时
- `0 0 * * *` - 每天0点

## 5. 手动触发爬虫

1. 进入仓库 **Actions → Crawler - 定时抓取AI中转商数据**
2. 点击 **Run workflow**
3. 可选择指定平台（v2ex/nodeseek/linux.do/xiaohongshu/all）
4. 点击 **Run workflow**

## 6. 查看部署状态

1. **Actions** 标签页查看工作流运行状态
2. **Pages** 标签页查看部署后的网站地址

## 7. 本地测试（带环境变量）

```bash
# 设置环境变量
export AI_API_KEY="your-api-key"
export AI_BASE_URL="https://token-plan-cn.xiaomimimo.com/v1"
export AI_MODEL="mimo-v2.5"

# 运行爬虫
npx tsx crawler/run.ts

# 启动前端
npm run dev
```

## 安全提示

⚠️ **永远不要将 API Key 提交到代码仓库！**

- ✅ 使用 GitHub Secrets 存储敏感信息
- ✅ 代码中通过 `process.env.XXX` 读取
- ❌ 不要将 `.env` 文件提交到仓库
- ❌ 不要在代码中硬编码 API Key

## 文件说明

| 文件 | 说明 |
|------|------|
| `.github/workflows/crawler.yml` | 爬虫定时任务 |
| `.github/workflows/deploy.yml` | 前端自动部署 |
| `crawler/src/config.ts` | 爬虫配置（从环境变量读取） |
