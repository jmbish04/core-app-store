/**
 * Prisma Client Setup for Cloudflare D1
 *
 * Configures Prisma with the D1 adapter for use in Workers.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';

export function getPrismaClient(db: D1Database): PrismaClient {
  const adapter = new PrismaD1(db);
  const prisma = new PrismaClient({ adapter });
  return prisma;
}
