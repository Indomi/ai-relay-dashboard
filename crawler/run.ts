#!/usr/bin/env tsx
/**
 * 爬虫运行脚本
 * 用法:
 *   npx tsx crawler/run.ts           # 运行所有爬虫
 *   npx tsx crawler/run.ts v2ex      # 运行指定爬虫
 */

import { runAllCrawlers, runSingleCrawler, printStats } from "./src/scheduler";

async function main() {
  const args = process.argv.slice(2);
  const platform = args[0];

  console.log("🚀 AI中转商大盘 - 爬虫启动\n");

  if (platform) {
    console.log(`运行单个爬虫: ${platform}\n`);
    const result = await runSingleCrawler(platform);
    printStats([result]);
  } else {
    console.log("运行所有爬虫\n");
    const results = await runAllCrawlers();
    printStats(results);
  }
}

main().catch(console.error);
