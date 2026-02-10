import { drizzle } from "drizzle-orm/bun-sqlite";

import * as schema from "./schema.ts";
import * as authSchema from "./auth-schema.ts";
import { env } from "@/env";

export const db = drizzle(env.DATABASE_URL, {
  schema: {
    ...schema,
    ...authSchema,
  },
});
