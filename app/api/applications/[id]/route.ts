import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";

const validStatuses = new Set(["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"]);
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    const payload = await request.json() as Record<string, unknown>;
    const company = clean(payload.company); const role = clean(payload.role); const status = clean(payload.status);
    if (!company || !role) return Response.json({ error: "Perusahaan dan posisi wajib diisi." }, { status: 400 });
    if (!validStatuses.has(status)) return Response.json({ error: "Status tidak dikenali." }, { status: 400 });
    const [application] = await getDb().update(applications).set({
      company, role, status, location: clean(payload.location), workMode: clean(payload.workMode) || "Remote",
      jobUrl: clean(payload.jobUrl), salary: clean(payload.salary), appliedDate: clean(payload.appliedDate),
      nextStepDate: clean(payload.nextStepDate), notes: clean(payload.notes), updatedAt: sql`CURRENT_TIMESTAMP`,
    }).where(eq(applications.id, id)).returning();
    if (!application) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return Response.json({ application });
  } catch { return Response.json({ error: "Perubahan belum dapat disimpan. Coba lagi." }, { status: 500 }); }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number.parseInt((await params).id, 10);
    if (!Number.isFinite(id)) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    const [deleted] = await getDb().delete(applications).where(eq(applications.id, id)).returning({ id: applications.id });
    if (!deleted) return Response.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return Response.json({ deleted: true, id: deleted.id });
  } catch { return Response.json({ error: "Lamaran belum dapat dihapus. Coba lagi." }, { status: 500 }); }
}
