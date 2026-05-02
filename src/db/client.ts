import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

declare global {
  var __finalive_db_client: ReturnType<typeof postgres> | undefined;
}

function getClient(): ReturnType<typeof postgres> {
  if (!globalThis.__finalive_db_client) {
    const env = getEnv();
    globalThis.__finalive_db_client = postgres(env.DATABASE_URL, {
      max: env.NODE_ENV === "production" ? 10 : 4,
      prepare: false,
    });
  }
  return globalThis.__finalive_db_client;
}

export const db = drizzle(getClient(), { schema });
export type DbClient = typeof db;
export { schema };
