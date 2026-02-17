import { PrismaClient } from "@prisma/client";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool as PgPool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import ws from "ws";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined");
  }

  // Use standard pg driver in development, Neon adapter in production
  if (process.env.NODE_ENV === "development") {
    // Standard PostgreSQL driver for local development
    const pool = new PgPool({ connectionString });
    const adapter = new PrismaPg(pool);
    
    return new PrismaClient({
      adapter,
      log: ["error", "warn"],
    });
  } else {
    // Neon serverless adapter for production
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString });
    const adapter = new PrismaNeon(pool);
    
    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
