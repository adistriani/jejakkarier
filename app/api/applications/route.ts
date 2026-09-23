import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";

const validStatuses = new Set(["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"]);

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return message.includes("no such table") || message.includes("applications")
    ? "Penyimpanan sedang disiapkan. Coba lagi sebentar."
    : "Data belum dapat diproses. Coba lagi.";
}

export async function GET() {
  try {
    const rows = await getDb().select().from(applications).orderBy(desc(applications.updatedAt), desc(applications.id)).limit(250);
    return Response.json({ applications: rows });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const company = clean(payload.company); const role = clean(payload.role);
    const status = clean(payload.status) || "Dilamar";
    if (!company || !role) return Response.json({ error: "Perusahaan dan posisi wajib diisi." }, { status: 400 });
    if (!validStatuses.has(status)) return Response.json({ error: "Status tidak dikenali." }, { status: 400 });
    const [application] = await getDb().insert(applications).values({
      company, role, status, location: clean(payload.location), workMode: clean(payload.workMode) || "Remote",
      jobUrl: clean(payload.jobUrl), salary: clean(payload.salary), appliedDate: clean(payload.appliedDate),
      nextStepDate: clean(payload.nextStepDate), notes: clean(payload.notes),
    }).returning();
    return Response.json({ application }, { status: 201 });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}
