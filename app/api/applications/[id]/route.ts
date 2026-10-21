import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { getCurrentUser } from "@/lib/current-user";
import { findDuplicateJob, jobUrlKey } from "@/lib/job-url";

const validStatuses = new Set(["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"]);
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
async function duplicateResponse(userId: string, jobUrl: string, ignoreId?: number) {
  if (!jobUrl) return null;
  const rows = await getDb().select({ id: applications.id, jobUrl: applications.jobUrl, company: applications.company, role: applications.role }).from(applications).where(eq(applications.userId, userId));
  const current = rows.find((row) => row.id === ignoreId);
  if (current && jobUrlKey(current.jobUrl) === jobUrlKey(jobUrl)) return null;
  const duplicate = findDuplicateJob(rows, jobUrl, ignoreId);
  return duplicate ? Response.json({ error: `Lowongan ini sudah ditambahkan sebelumnya (${duplicate.role} di ${duplicate.company}).` }, { status: 409 }) : null;
}


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    const payload = await request.json() as Record<string, unknown>;
    const company = clean(payload.company); const role = clean(payload.role); const status = clean(payload.status);
    if (!company || !role) return Response.json({ error: "Perusahaan dan posisi wajib diisi." }, { status: 400 });
    if (!validStatuses.has(status)) return Response.json({ error: "Status tidak dikenali." }, { status: 400 });
    const duplicate = await duplicateResponse(user.id, clean(payload.jobUrl), id);
    if (duplicate) return duplicate;
    const [application] = await getDb().update(applications).set({
      company, role, status, location: clean(payload.location), workMode: clean(payload.workMode) || "Remote",
      jobUrl: clean(payload.jobUrl), salary: clean(payload.salary), appliedDate: clean(payload.appliedDate),
      nextStepDate: clean(payload.nextStepDate), notes: clean(payload.notes), updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(and(eq(applications.id, id), eq(applications.userId, user.id))).returning();
    if (!application) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return Response.json({ application });
  } catch { return Response.json({ error: "Perubahan belum dapat disimpan. Coba lagi." }, { status: 500 }); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    const [deleted] = await getDb().delete(applications).where(and(eq(applications.id, id), eq(applications.userId, user.id))).returning({ id: applications.id });
    if (!deleted) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: deleted.id });
  } catch { return Response.json({ error: "Lamaran belum dapat dihapus. Coba lagi." }, { status: 500 }); }
}
