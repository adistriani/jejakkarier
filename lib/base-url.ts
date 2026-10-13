function validUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

// BETTER_AUTH_URL bisa berisi placeholder (mis. "[SENSITIVE]" dari `vercel env pull`),
// jadi validasi dulu dan jatuh ke VERCEL_URL atau localhost.
export function getAppBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  return (
    validUrl(process.env.BETTER_AUTH_URL) ??
    validUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://localhost:3000"
  );
}
