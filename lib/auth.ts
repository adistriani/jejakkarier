import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/auth-schema";
import { getAppBaseUrl } from "@/lib/base-url";

const baseURL = getAppBaseUrl();

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [...new Set(["http://localhost:3000", baseURL])],
  plugins: [nextCookies()],
});
