import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

interface JsonProvider {
  id: string;
  name: string;
  website?: string;
  contact?: string;
  description?: string;
  billingType?: string;
  status?: string;
  heatScore?: number;
  mentionCount?: number;
  tags?: string[];
  confidence?: number;
  firstSeen: string;
  lastSeen: string;
  models: { model: string; inputPrice?: number; outputPrice?: number; currency?: string }[];
  sources: { platform: string; title: string; url: string; author?: string; publishedAt: string; snippet?: string }[];
}

async function migrate() {
  // 读取现有 JSON 数据
  const fs = require("fs");
  const path = require("path");
  const jsonPath = path.join(__dirname, "data/providers.json");
  const jsonData: JsonProvider[] = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`[Migrate] Found ${jsonData.length} providers in JSON`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const p of jsonData) {
    try {
      // 检查是否已存在
      const existing = await prisma.provider.findFirst({
        where: {
          OR: [
            { id: p.id },
            { name: p.name },
          ],
        },
      });

      if (existing) {
        console.log(`[Migrate] Skipping existing: ${p.name}`);
        updated++;
        continue;
      }

      // 创建新商家
      await prisma.provider.create({
        data: {
          id: p.id,
          name: p.name,
          website: p.website || null,
          contact: p.contact || null,
          description: p.description || null,
          billingType: p.billingType || "token",
          status: p.status || "active",
          heatScore: p.heatScore || 0,
          mentionCount: p.mentionCount || 0,
          tags: p.tags || [],
          confidence: p.confidence || 0,
          firstSeen: new Date(p.firstSeen),
          lastSeen: new Date(p.lastSeen),
          models: {
            create: p.models.map((m) => ({
              model: m.model,
              inputPrice: m.inputPrice,
              outputPrice: m.outputPrice,
              currency: m.currency || "CNY",
            })),
          },
          sources: {
            create: p.sources.map((s) => ({
              platform: s.platform,
              title: s.title,
              url: s.url,
              author: s.author || null,
              publishedAt: s.publishedAt ? new Date(s.publishedAt) : null,
            })),
          },
        },
      });

      console.log(`[Migrate] Created: ${p.name}`);
      created++;
    } catch (error) {
      console.error(`[Migrate] Error migrating ${p.name}:`, error);
      errors++;
    }
  }

  console.log(`\n[Migrate] Done! Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
