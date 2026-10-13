import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/auth-schema";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  trustedOrigins: ["http://localhost:3000", process.env.BETTER_AUTH_URL].filter(Boolean) as string[],
  plugins: [nextCookies()],
});
