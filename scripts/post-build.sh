#!/bin/bash
# Vercel 构建后脚本 - 创建数据库表

echo "[Post-build] Checking database connection..."

# 如果有数据库连接，创建表结构
if [ -n "$POSTGRES_PRISMA_URL" ] || [ -n "$DATABASE_URL" ]; then
  echo "[Post-build] Running prisma db push..."
  npx prisma db push --accept-data-loss 2>&1 || echo "[Post-build] Prisma push failed, tables may already exist"
else
  echo "[Post-build] No database URL found, skipping db push"
fi

echo "[Post-build] Done!"
