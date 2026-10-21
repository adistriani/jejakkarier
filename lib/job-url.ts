const trackingParams = /^(utm_.*|trk|trkInfo|ref|refId|trackingId|src|source|fbclid|gclid|lipi|originalSubdomain|eBP|position|pageNum)$/i;

// Ubah tautan lowongan menjadi kunci pembanding, supaya tautan yang sama
// dengan parameter pelacak berbeda tetap dianggap lowongan yang sama.
export function jobUrlKey(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return raw.toLowerCase();
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (host.endsWith("linkedin.com")) {
    const id = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/)?.[1] ?? url.searchParams.get("currentJobId");
    if (id) return `linkedin:${id}`;
  }

  const params = [...url.searchParams.entries()]
    .filter(([key]) => !trackingParams.test(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${key}=${val}`)
    .join("&");
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}${params ? `?${params}` : ""}`;
}

export function findDuplicateJob<T extends { id: number; jobUrl: string }>(items: T[], jobUrl: string, ignoreId?: number) {
  const key = jobUrlKey(jobUrl);
  if (!key) return undefined;
  return items.find((item) => item.id !== ignoreId && jobUrlKey(item.jobUrl) === key);
}
