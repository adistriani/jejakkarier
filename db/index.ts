import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL belum tersedia. Hubungkan basis data Neon ke proyek Vercel.");
  }
  return drizzle(neon(databaseUrl), { schema });
}

let db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!db) db = createDb();
  return db;
}
