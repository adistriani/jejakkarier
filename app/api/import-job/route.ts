type JsonRecord = Record<string, unknown>;

const MAX_BYTES = 1_500_000;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function plainText(value: unknown, limit = 1200) {
  if (typeof value !== "string") return "";
  return decodeHtml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim()).slice(0, limit);
}

function findJobPosting(value: unknown): JsonRecord | null {
  if (Array.isArray(value)) {
    for (const item of value) { const found = findJobPosting(item); if (found) return found; }
    return null;
  }
  if (!isRecord(value)) return null;
  const type = value["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return value;
  if (value["@graph"]) return findJobPosting(value["@graph"]);
  return null;
}

function readMeta(html: string, key: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)) attrs[match[1].toLowerCase()] = match[2];
    if (attrs.property?.toLowerCase() === key.toLowerCase() || attrs.name?.toLowerCase() === key.toLowerCase()) return decodeHtml(attrs.content ?? "");
  }
  return "";
}

function safeUrl(raw: unknown) {
  if (typeof raw !== "string" || raw.length > 2048) throw new Error("Masukkan link lowongan yang valid.");
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Masukkan link lowongan yang valid."); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error("Link tersebut tidak dapat dibuka.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const blocked = host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) throw new Error("Link tersebut tidak dapat dibuka.");
  return url;
}

async function readLimited(response: Response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) throw new Error("Halaman lowongan terlalu besar untuk dibaca.");
  if (!response.body) return "";
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let total = 0; let html = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.byteLength; if (total > MAX_BYTES) { await reader.cancel(); throw new Error("Halaman lowongan terlalu besar untuk dibaca."); }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

async function fetchPage(initial: URL) {
  let current = initial;
  for (let hop = 0; hop < 4; hop += 1) {
    const response = await fetch(current, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; JejakKarier/1.0)", Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(9000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location"); if (!location) throw new Error("Halaman lowongan mengalihkan ke alamat yang tidak valid.");
      current = safeUrl(new URL(location, current).toString()); continue;
    }
    if (!response.ok) throw new Error("Halaman lowongan menolak akses otomatis. Coba link publik lainnya.");
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("Link ini bukan halaman lowongan yang dapat dibaca.");
    return { html: await readLimited(response), finalUrl: current.toString() };
  }
  throw new Error("Terlalu banyak pengalihan saat membuka link.");
}

function extractAddress(location: unknown) {
  const first = Array.isArray(location) ? location[0] : location;
  if (!isRecord(first)) return "";
  const address = first.address;
  if (typeof address === "string") return address;
  if (!isRecord(address)) return "";
  return [address.addressLocality, address.addressRegion, address.addressCountry].filter((part) => typeof part === "string" && part).join(", ");
}

function extractSalary(baseSalary: unknown) {
  if (!isRecord(baseSalary)) return "";
  const currency = typeof baseSalary.currency === "string" ? baseSalary.currency : "";
  const value = baseSalary.value;
  if (typeof value === "number" || typeof value === "string") return `${currency} ${value}`.trim();
  if (!isRecord(value)) return "";
  const min = value.minValue; const max = value.maxValue; const unit = typeof value.unitText === "string" ? ` / ${value.unitText.toLowerCase()}` : "";
  if ((typeof min === "number" || typeof min === "string") && (typeof max === "number" || typeof max === "string")) return `${currency} ${min}–${max}${unit}`.trim();
  return "";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: unknown };
    const { html, finalUrl } = await fetchPage(safeUrl(body.url));
    let posting: JsonRecord | null = null;
    for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { posting = findJobPosting(JSON.parse(decodeHtml(match[1].trim()))); if (posting) break; } catch { /* ignore malformed metadata */ }
    }
    const pageTitle = readMeta(html, "og:title") || decodeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "");
    const organization = posting && isRecord(posting.hiringOrganization) ? posting.hiringOrganization : null;
    const remote = posting?.jobLocationType === "TELECOMMUTE";
    const role = plainText(posting?.title ?? posting?.name ?? pageTitle, 180).replace(/\s*[|–-]\s*(LinkedIn|Indeed|Glints|Jobstreet).*$/i, "");
    const company = plainText(organization?.name ?? readMeta(html, "og:site_name"), 160);
    const location = extractAddress(posting?.jobLocation);
    const description = plainText(posting?.description ?? readMeta(html, "description") ?? readMeta(html, "og:description"));
    const employment = plainText(posting?.employmentType, 120);
    const notes = [employment && `Tipe pekerjaan: ${employment}`, description].filter(Boolean).join("\n\n");
    if (!role && !company && !description) throw new Error("Detail lowongan tidak ditemukan di halaman ini. Coba link langsung ke halaman lowongannya.");
    return Response.json({ job: { role, company, location, workMode: remote ? "Remote" : location ? "On-site" : "Remote", jobUrl: finalUrl, salary: extractSalary(posting?.baseSalary), notes } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Data lowongan belum bisa dibaca.";
    return Response.json({ error: message }, { status: 400 });
  }
}
