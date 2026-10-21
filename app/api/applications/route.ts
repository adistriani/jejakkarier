import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { findDuplicateJob } from "@/lib/job-url";

const validStatuses = new Set(["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"]);

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
async function duplicateResponse(userId: string, jobUrl: string, ignoreId?: number) {
  if (!jobUrl) return null;
  const rows = await getDb().select({ id: applications.id, jobUrl: applications.jobUrl, company: applications.company, role: applications.role }).from(applications).where(eq(applications.userId, userId));
  const duplicate = findDuplicateJob(rows, jobUrl, ignoreId);
  return duplicate ? Response.json({ error: `Lowongan ini sudah ditambahkan sebelumnya (${duplicate.role} di ${duplicate.company}).` }, { status: 409 }) : null;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return message.includes("no such table") || message.includes("applications")
    ? "Penyimpanan sedang disiapkan. Coba lagi sebentar."
    : "Data belum dapat diproses. Coba lagi.";
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    const rows = await getDb().select().from(applications).where(eq(applications.userId, user.id)).orderBy(desc(applications.updatedAt), desc(applications.id)).limit(250);
    return Response.json({ applications: rows });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    const payload = await request.json() as Record<string, unknown>;
    const company = clean(payload.company); const role = clean(payload.role);
    const status = clean(payload.status) || "Dilamar";
    if (!company || !role) return Response.json({ error: "Perusahaan dan posisi wajib diisi." }, { status: 400 });
    if (!validStatuses.has(status)) return Response.json({ error: "Status tidak dikenali." }, { status: 400 });
    const duplicate = await duplicateResponse(user.id, clean(payload.jobUrl));
    if (duplicate) return duplicate;
    const [application] = await getDb().insert(applications).values({
      userId: user.id, company, role, status, location: clean(payload.location), workMode: clean(payload.workMode) || "Remote",
      jobUrl: clean(payload.jobUrl), salary: clean(payload.salary), appliedDate: clean(payload.appliedDate),
      nextStepDate: clean(payload.nextStepDate), notes: clean(payload.notes),
    }).returning();
    return Response.json({ application }, { status: 201 });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}
