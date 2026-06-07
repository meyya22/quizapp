import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Neon serverless databases auto-suspend; extend connect_timeout so the first
// query after a cold-start has enough time to wake the database.
function buildDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes('connect_timeout')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connect_timeout=30`;
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl: buildDatasourceUrl(),
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
