import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import {} from "bun:sqlite";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
