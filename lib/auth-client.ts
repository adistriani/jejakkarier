import { createAuthClient } from "better-auth/react";
import { getAppBaseUrl } from "@/lib/base-url";

export const authClient = createAuthClient({ baseURL: getAppBaseUrl() });
