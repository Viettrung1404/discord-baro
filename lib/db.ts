import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const parseIntEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const pool = globalThis.prismaPool ?? new Pool({
  connectionString,
  max: parseIntEnv(process.env.PG_POOL_MAX, 5),
  min: parseIntEnv(process.env.PG_POOL_MIN, 0),
  idleTimeoutMillis: parseIntEnv(process.env.PG_POOL_IDLE_TIMEOUT_MS, 10_000),
  connectionTimeoutMillis: parseIntEnv(process.env.PG_POOL_CONNECT_TIMEOUT_MS, 10_000),
  maxUses: parseIntEnv(process.env.PG_POOL_MAX_USES, 5_000),
  allowExitOnIdle: process.env.NODE_ENV !== 'production',
});
const adapter = new PrismaPg(pool);

export const db = globalThis.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaPool = pool;
}

if (process.env.NODE_ENV !== 'production') globalThis.prisma = db;