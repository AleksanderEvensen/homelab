import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { env } from "@/env";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  out: "./drizzle",
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  dialect: "sqlite",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
