import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Neon serverless databases auto-suspend; extend connect_timeout so the first
// query after a cold-start has enough time to wake the database.
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const params: string[] = [];
  if (!url.includes('connect_timeout')) params.push('connect_timeout=30');
  if (!url.includes('connection_limit')) params.push('connection_limit=10');
  if (!url.includes('pool_timeout')) params.push('pool_timeout=20');
  if (params.length === 0) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.join('&')}`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: buildDatasourceUrl(),
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
