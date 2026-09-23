"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, MapPin, MoreHorizontal, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

const statuses = ["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"] as const;
type Status = (typeof statuses)[number];

type Application = {
  id: number; company: string; role: string; status: Status; location: string;
  workMode: string; jobUrl: string; salary: string; appliedDate: string;
  nextStepDate: string; notes: string; createdAt: string; updatedAt: string;
};
type FormState = Omit<Application, "id" | "createdAt" | "updatedAt">;

const emptyForm: FormState = {
  company: "", role: "", status: "Dilamar", location: "", workMode: "Remote",
  jobUrl: "", salary: "", appliedDate: new Date().toISOString().slice(0, 10),
  nextStepDate: "", notes: "",
};

const sampleApplications: Application[] = [
  { id: -1, company: "Studio Nusantara", role: "Product Designer", status: "Wawancara", location: "Jakarta", workMode: "Hybrid", jobUrl: "", salary: "", appliedDate: "2026-09-18", nextStepDate: "2026-09-25", notes: "Siapkan studi kasus redesign dan pertanyaan untuk tim produk.", createdAt: "", updatedAt: "" },
  { id: -2, company: "Kreasi Digital", role: "UX Researcher", status: "Dilamar", location: "Bandung", workMode: "Remote", jobUrl: "", salary: "", appliedDate: "2026-09-20", nextStepDate: "2026-09-27", notes: "Follow up bila belum ada kabar dalam satu minggu.", createdAt: "", updatedAt: "" },
  { id: -3, company: "Langkah Baru", role: "Senior UI Designer", status: "Tersimpan", location: "Surabaya", workMode: "On-site", jobUrl: "", salary: "", appliedDate: "", nextStepDate: "2026-09-24", notes: "Sesuaikan CV dengan kebutuhan design system.", createdAt: "", updatedAt: "" },
];

const statusStyle: Record<Status, string> = {
  Tersimpan: "status-saved", Dilamar: "status-applied", Wawancara: "status-interview",
  Penawaran: "status-offer", Selesai: "status-closed",
};

function dateLabel(date: string) {
  if (!date) return "Belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function isDueSoon(date: string) {
  if (!date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86400000);
  return days >= 0 && days <= 3;
}

export default function Home() {
  const [items, setItems] = useState<Application[]>(sampleApplications);
  const [isDemo, setIsDemo] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Semua" | Status>("Semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function loadApplications() {
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      const data = await response.json() as { applications: Application[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Data belum dapat dimuat.");
      setItems(data.applications); setIsDemo(false); setError("");
    } catch { setError("Mode pratinjau aktif. Data contoh ditampilkan sementara."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadApplications(); }, []);

  useEffect(() => {
    const context = typeof document === "undefined" ? undefined : document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "create_job_application",
        title: "Tambah lamaran kerja",
        description: "Mencatat lowongan atau lamaran baru ke tracker dan memperbarui tampilan.",
        inputSchema: {
          type: "object",
          properties: {
            company: { type: "string", minLength: 1 }, role: { type: "string", minLength: 1 },
            status: { type: "string", enum: statuses }, location: { type: "string" },
            workMode: { type: "string", enum: ["Remote", "Hybrid", "On-site"] },
            appliedDate: { type: "string", format: "date" }, nextStepDate: { type: "string", format: "date" }, notes: { type: "string" },
          },
          required: ["company", "role"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const value = input as Partial<FormState>;
          if (!value.company?.trim() || !value.role?.trim()) throw new Error("Perusahaan dan posisi wajib diisi.");
          const payload = { ...emptyForm, ...value, company: value.company.trim(), role: value.role.trim() };
          const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await response.json() as { application: Application; error?: string };
          if (!response.ok) throw new Error(data.error || "Gagal menyimpan lamaran.");
          setItems((current) => [data.application, ...current.filter((item) => item.id > 0)]); setIsDemo(false);
          return { id: data.application.id, company: data.application.company, role: data.application.role, status: data.application.status };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => (filter === "Semua" || item.status === filter) && (!query || `${item.company} ${item.role} ${item.location}`.toLowerCase().includes(query)));
  }, [items, search, filter]);

  const stats = useMemo(() => ({
    active: items.filter((item) => !["Selesai", "Penawaran"].includes(item.status)).length,
    interview: items.filter((item) => item.status === "Wawancara").length,
    offer: items.filter((item) => item.status === "Penawaran").length,
    due: items.filter((item) => isDueSoon(item.nextStepDate)).length,
  }), [items]);

  function openCreate() { setEditing(null); setForm({ ...emptyForm, appliedDate: new Date().toISOString().slice(0, 10) }); setDialogOpen(true); }
  function openEdit(item: Application) {
    if (item.id < 0) return;
    setEditing(item);
    setForm({ company: item.company, role: item.role, status: item.status, location: item.location, workMode: item.workMode, jobUrl: item.jobUrl, salary: item.salary, appliedDate: item.appliedDate, nextStepDate: item.nextStepDate, notes: item.notes });
    setDialogOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/applications/${editing.id}` : "/api/applications", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json() as { application: Application; error?: string };
      if (!response.ok) throw new Error(data.error || "Lamaran belum berhasil disimpan.");
      setItems((current) => editing ? current.map((item) => item.id === editing.id ? data.application : item) : [data.application, ...current.filter((item) => item.id > 0)]);
      setIsDemo(false); setDialogOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lamaran belum berhasil disimpan."); }
    finally { setSaving(false); }
  }

  async function removeApplication() {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/applications/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Lamaran belum berhasil dihapus.");
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id)); setDeleteTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lamaran belum berhasil dihapus."); }
  }

  return (
    <main className="min-h-screen pb-16">
      <section className="hero-shell">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3"><div className="brand-mark"><BriefcaseBusiness aria-hidden="true" /></div><div><p className="brand-name">Jejak Karier</p><p className="brand-kicker">TRACKER LAMARAN</p></div></div>
          <Button onClick={openCreate} className="add-button h-11 rounded-full px-5"><Plus aria-hidden="true" /> Tambah lamaran</Button>
        </nav>
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 lg:px-10 lg:pb-28 lg:pt-12">
          <div className="max-w-2xl"><div className="eyebrow"><Sparkles aria-hidden="true" /> RAPIKAN PROSESMU</div><h1>Semua peluangmu,<br /><span>dalam satu jejak.</span></h1><p className="hero-copy">Catat setiap lowongan, pantau tahap seleksi, dan jangan lewatkan tindak lanjut penting.</p></div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="stats-grid">
          <article className="stat-card"><div className="stat-icon blue"><BriefcaseBusiness /></div><div><p>Proses aktif</p><strong>{stats.active}</strong></div></article>
          <article className="stat-card"><div className="stat-icon purple"><CalendarDays /></div><div><p>Wawancara</p><strong>{stats.interview}</strong></div></article>
          <article className="stat-card"><div className="stat-icon green"><Check /></div><div><p>Penawaran</p><strong>{stats.offer}</strong></div></article>
          <article className="stat-card"><div className="stat-icon orange"><Clock3 /></div><div><p>Perlu aksi</p><strong>{stats.due}</strong></div></article>
        </div>

        <div className="workspace-panel mt-6">
          <div className="workspace-top"><div><p className="section-kicker">LAMARANMU</p><h2>Peluang yang sedang kamu kejar</h2></div><div className="search-box"><Search aria-hidden="true" /><Input aria-label="Cari perusahaan atau posisi" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari perusahaan atau posisi..." /></div></div>
          <div className="filter-row" aria-label="Filter status">
            {(["Semua", ...statuses] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}<span>{status === "Semua" ? items.length : items.filter((item) => item.status === status).length}</span></button>)}
          </div>
          {error && <div className="notice"><CircleAlert aria-hidden="true" /><span>{error}</span></div>}
          <div className="applications-list" aria-busy={loading}>
            {visibleItems.map((item) => (
              <article key={item.id} className="application-card">
                <div className="company-avatar" aria-hidden="true">{item.company.slice(0, 1).toUpperCase()}</div>
                <div className="application-main">
                  <div className="application-title-row"><div><h3>{item.role}</h3><p className="company"><Building2 /> {item.company}</p></div><span className={`status-pill ${statusStyle[item.status]}`}>{item.status}</span></div>
                  <div className="meta-row"><span><MapPin /> {item.location || "Lokasi belum diisi"}</span><span>{item.workMode}</span>{item.appliedDate && <span>Dilamar {dateLabel(item.appliedDate)}</span>}</div>
                  <div className="next-step"><Clock3 /><div><span>Langkah berikutnya</span><strong>{dateLabel(item.nextStepDate)}</strong></div>{isDueSoon(item.nextStepDate) && <em>Segera</em>}</div>
                </div>
                <div className="card-actions">
                  {item.jobUrl && <Button variant="ghost" size="icon" asChild><a href={item.jobUrl} target="_blank" rel="noreferrer" aria-label="Buka lowongan"><ArrowUpRight /></a></Button>}
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Aksi lainnya" disabled={item.id < 0}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(item)}><Pencil /> Edit lamaran</DropdownMenuItem><DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(item)}><Trash2 /> Hapus</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  <ChevronRight className="chevron" aria-hidden="true" />
                </div>
              </article>
            ))}
            {!loading && visibleItems.length === 0 && <div className="empty-state"><div><BriefcaseBusiness /></div><h3>{search || filter !== "Semua" ? "Belum ada yang cocok" : "Mulai jejak pertamamu"}</h3><p>{search || filter !== "Semua" ? "Coba ubah kata pencarian atau filter status." : "Tambahkan lowongan pertama agar semua proses tetap terpantau."}</p>{!search && filter === "Semua" && <Button onClick={openCreate}><Plus /> Tambah lamaran</Button>}</div>}
          </div>
          {isDemo && <p className="demo-note">Data contoh untuk memperlihatkan tampilan tracker. Tambahkan lamaran untuk mulai memakai datamu sendiri.</p>}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editing ? "Edit lamaran" : "Tambah lamaran baru"}</DialogTitle><DialogDescription>Simpan informasi penting agar langkah berikutnya selalu jelas.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="application-form"><div className="field-grid">
          <div><Label htmlFor="company">Perusahaan</Label><Input id="company" required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Nama perusahaan" /></div>
          <div><Label htmlFor="role">Posisi</Label><Input id="role" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Contoh: Product Designer" /></div>
          <div><Label htmlFor="status">Status</Label><NativeSelect id="status" className="w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}>{statuses.map((status) => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}</NativeSelect></div>
          <div><Label htmlFor="mode">Cara kerja</Label><NativeSelect id="mode" className="w-full" value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}><NativeSelectOption>Remote</NativeSelectOption><NativeSelectOption>Hybrid</NativeSelectOption><NativeSelectOption>On-site</NativeSelectOption></NativeSelect></div>
          <div><Label htmlFor="location">Lokasi</Label><Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Kota atau negara" /></div>
          <div><Label htmlFor="salary">Rentang gaji</Label><Input id="salary" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="Contoh: Rp15–20 juta" /></div>
          <div><Label htmlFor="applied">Tanggal dilamar</Label><Input id="applied" type="date" value={form.appliedDate} onChange={(e) => setForm({ ...form, appliedDate: e.target.value })} /></div>
          <div><Label htmlFor="next">Langkah berikutnya</Label><Input id="next" type="date" value={form.nextStepDate} onChange={(e) => setForm({ ...form, nextStepDate: e.target.value })} /></div>
        </div><div><Label htmlFor="url">Tautan lowongan</Label><Input id="url" type="url" value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} placeholder="https://..." /></div><div><Label htmlFor="notes">Catatan</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Kontak recruiter, persiapan wawancara, atau hal penting lainnya..." rows={4} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah lamaran"}</Button></DialogFooter></form>
      </DialogContent></Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus lamaran ini?</AlertDialogTitle><AlertDialogDescription>Catatan untuk {deleteTarget?.role} di {deleteTarget?.company} akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeApplication}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}
