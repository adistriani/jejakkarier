"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, Check, CircleAlert, Clock3, Link2, LoaderCircle, LogIn, MapPin, Pencil, Plus, Search, Sparkles, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { TipCard } from "@/components/tip-card";

const statuses = ["Tersimpan", "Dilamar", "Wawancara", "Penawaran", "Selesai"] as const;
type Status = (typeof statuses)[number];

type Application = {
  id: number; company: string; role: string; status: Status; location: string;
  workMode: string; jobUrl: string; salary: string; appliedDate: string;
  nextStepDate: string; notes: string; createdAt: string; updatedAt: string;
};
type FormState = Omit<Application, "id" | "createdAt" | "updatedAt">;

// Tanggal lokal (bukan UTC) agar sesuai hari ini di zona waktu pengguna.
function todayDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const emptyForm: FormState = {
  company: "", role: "", status: "Dilamar", location: "", workMode: "Remote",
  jobUrl: "", salary: "", appliedDate: todayDate(),
  nextStepDate: "", notes: "",
};

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
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [items, setItems] = useState<Application[]>([]);
  const itemsRef = useRef<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Semua" | Status>("Semua");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | "forgot">("sign-in");
  const [resetSent, setResetSent] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSaving, setAuthSaving] = useState(false);
  const isSignedIn = Boolean(session?.user);

  function saveApplications(nextItems: Application[]) {
    itemsRef.current = nextItems;
    setItems(nextItems);
  }

  async function loadApplications() {
    setLoading(true);
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });
      const data = await response.json() as { applications?: Application[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Data belum dapat dimuat.");
      saveApplications(data.applications ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Data belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("masuk") !== "1") return;
    window.history.replaceState(null, "", window.location.pathname);
    if (!isSignedIn) openAuth();
  }, [sessionPending]);

  useEffect(() => {
    if (sessionPending) return;
    if (!isSignedIn) {
      saveApplications([]);
      setLoading(false);
      return;
    }
    void loadApplications();
  }, [isSignedIn, sessionPending]);

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
          const payload = { ...emptyForm, appliedDate: todayDate(), ...value, company: value.company.trim(), role: value.role.trim() };
          const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
          const data = await response.json() as { application?: Application; error?: string };
          if (!response.ok || !data.application) throw new Error(data.error || "Masuk ke akunmu terlebih dahulu untuk menyimpan lamaran.");
          saveApplications([data.application, ...itemsRef.current]);
          return { id: data.application.id, company: data.application.company, role: data.application.role, status: data.application.status };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [isSignedIn]);

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

  function openAuth(mode: "sign-in" | "sign-up" | "forgot" = "sign-in") { setAuthMode(mode); setAuthError(""); setResetSent(false); setAuthOpen(true); }
  function openCreate() { if (!isSignedIn) return openAuth(); setEditing(null); setForm({ ...emptyForm, appliedDate: todayDate() }); setDialogOpen(true); }
  function openEdit(item: Application) {
    setEditing(item);
    setForm({ company: item.company, role: item.role, status: item.status, location: item.location, workMode: item.workMode, jobUrl: item.jobUrl, salary: item.salary, appliedDate: item.appliedDate, nextStepDate: item.nextStepDate, notes: item.notes });
    setDialogOpen(true);
  }
  function openDetail(item: Application) { setSelectedApplication(item); }

  async function importJob(event: FormEvent) {
    event.preventDefault();
    if (!importUrl.trim()) return;
    if (!isSignedIn) return openAuth();
    setImporting(true); setImportError("");
    try {
      const response = await fetch("/api/import-job", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const data = await response.json() as { job?: Partial<FormState>; error?: string };
      if (!response.ok || !data.job) throw new Error(data.error || "Data lowongan belum bisa dibaca.");
      setEditing(null);
      setForm({ ...emptyForm, status: "Tersimpan", ...data.job, appliedDate: todayDate(), jobUrl: importUrl.trim() });
      setDialogOpen(true);
    } catch (cause) {
      setImportError(cause instanceof Error ? cause.message : "Data lowongan belum bisa dibaca.");
    } finally { setImporting(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/applications/${editing.id}` : "/api/applications", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await response.json() as { application?: Application; error?: string };
      if (!response.ok || !data.application) throw new Error(data.error || "Lamaran belum berhasil disimpan.");
      saveApplications(editing ? itemsRef.current.map((item) => item.id === editing.id ? data.application! : item) : [data.application, ...itemsRef.current]);
      setDialogOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lamaran belum berhasil disimpan."); }
    finally { setSaving(false); }
  }

  async function removeApplication() {
    if (!deleteTarget) return;
    try {
      const response = await fetch(`/api/applications/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Lamaran belum berhasil dihapus.");
      saveApplications(itemsRef.current.filter((item) => item.id !== deleteTarget.id)); setDeleteTarget(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Lamaran belum berhasil dihapus."); }
  }

  async function updateStatus(item: Application, status: Status) {
    if (item.status === status) return;
    setUpdatingId(item.id); setError("");
    try {
      const response = await fetch(`/api/applications/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, status }) });
      const data = await response.json() as { application?: Application; error?: string };
      if (!response.ok || !data.application) throw new Error(data.error || "Status belum berhasil diperbarui.");
      saveApplications(itemsRef.current.map((currentItem) => currentItem.id === item.id ? data.application! : currentItem));
      setSelectedApplication((current) => current?.id === item.id ? data.application! : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Status belum berhasil diperbarui.");
    } finally { setUpdatingId(null); }
  }

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setAuthSaving(true); setAuthError("");
    try {
      if (authMode === "forgot") {
        const result = await authClient.requestPasswordReset({ email: authEmail.trim(), redirectTo: "/reset-password" });
        if (result.error) throw new Error(result.error.message || "Tautan atur ulang belum dapat dikirim.");
        setResetSent(true);
        return;
      }
      const result = authMode === "sign-up"
        ? await authClient.signUp.email({ name: authName.trim(), email: authEmail.trim(), password: authPassword })
        : await authClient.signIn.email({ email: authEmail.trim(), password: authPassword });
      if (result.error) throw new Error(result.error.message || "Akun belum dapat diproses.");
      setAuthPassword(""); setAuthOpen(false);
    } catch (cause) {
      setAuthError(cause instanceof Error ? cause.message : "Akun belum dapat diproses.");
    } finally { setAuthSaving(false); }
  }

  async function signOut() {
    await authClient.signOut();
    saveApplications([]);
    setSelectedApplication(null);
  }

  return (
    <main className="min-h-screen pb-16">
      <section className="hero-shell">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3"><div className="brand-mark"><BriefcaseBusiness aria-hidden="true" /></div><div><p className="brand-name">Jejak Karier</p><p className="brand-kicker">TRACKER LAMARAN</p></div></div>
          {isSignedIn ? <div className="user-chip"><UserRound aria-hidden="true" /><span className="user-chip-name">{session?.user.name || session?.user.email}</span><button type="button" onClick={() => void signOut()}>Keluar</button></div> : <Button onClick={() => openAuth()} className="add-button h-11 rounded-full px-5"><LogIn aria-hidden="true" /> Masuk</Button>}
        </nav>
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-8 sm:px-8 lg:px-10 lg:pb-28 lg:pt-12">
          <div className="max-w-3xl"><div className="eyebrow"><Sparkles aria-hidden="true" /> TAMBAH DALAM HITUNGAN DETIK</div><h1>Tempel link.<br /><span>Detail lokermu langsung masuk.</span></h1><p className="hero-copy">Jejak Karier membantu merapikan detail dan progres setiap lamaranmu.</p>
            <form className="import-bar" onSubmit={importJob}>
              <Link2 aria-hidden="true" />
              <Input aria-label="Link lowongan kerja" type="url" required value={importUrl} onChange={(event) => setImportUrl(event.target.value)} placeholder="Tempel link lowongan di sini..." />
              <Button type="submit" disabled={importing}>{importing ? <><LoaderCircle className="spin" /> Membaca...</> : "Ambil data"}</Button>
            </form>
            {importError && <p className="import-error"><CircleAlert /> {importError}</p>}
            <p className="import-help">Berfungsi paling baik pada halaman lowongan yang dapat diakses publik. Masuk ke akunmu agar data tersedia di semua perangkat.</p>
          </div>
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
          <div className="workspace-top"><div><p className="section-kicker">LAMARANMU</p><h2>Peluang yang sedang kamu kejar</h2></div><div className="workspace-actions">{isSignedIn && <Button onClick={openCreate} className="add-button h-11 rounded-xl px-5"><Plus aria-hidden="true" /> Tambah lamaran</Button>}<div className="search-box"><Search aria-hidden="true" /><Input aria-label="Cari perusahaan atau posisi" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari perusahaan atau posisi..." /></div></div></div>
          <div className="filter-row" aria-label="Filter status">
            {(["Semua", ...statuses] as const).map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}<span>{status === "Semua" ? items.length : items.filter((item) => item.status === status).length}</span></button>)}
          </div>
          {error && <div className="notice"><CircleAlert aria-hidden="true" /><span>{error}</span></div>}
          <div className="applications-list" aria-busy={loading}>
            {visibleItems.map((item) => (
              <article key={item.id} className="application-card">
                <div className="company-avatar" aria-hidden="true">{item.company.slice(0, 1).toUpperCase()}</div>
                <div className="application-main">
                  <div className="application-title-row"><div className="title-line"><h3>{item.role}</h3><span className={`status-pill ${statusStyle[item.status]}`}>{item.status}</span></div><p className="company"><Building2 /> {item.company}</p></div>
                  <div className="meta-row"><span><MapPin /> {item.location || "Lokasi belum diisi"}</span><span>{item.workMode}</span>{item.appliedDate && <span>Dilamar {dateLabel(item.appliedDate)}</span>}</div>
                  <div className="quick-status"><NativeSelect aria-label={`Ubah status ${item.role} di ${item.company}`} size="sm" value={item.status} disabled={updatingId === item.id} onChange={(event) => void updateStatus(item, event.target.value as Status)}>{statuses.map((status) => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}</NativeSelect>{updatingId === item.id && <LoaderCircle className="spin" aria-label="Memperbarui status" />}</div>
                </div>
                <div className="card-actions">
                  <Button variant="outline" size="sm" className="detail-button" onClick={() => openDetail(item)}>Detail</Button>
                </div>
              </article>
            ))}
            {!loading && visibleItems.length === 0 && <div className="empty-state"><div><BriefcaseBusiness /></div><h3>{search || filter !== "Semua" ? "Belum ada yang cocok" : "Mulai jejak pertamamu"}</h3><p>{search || filter !== "Semua" ? "Coba ubah kata pencarian atau filter status." : "Tambahkan lowongan pertama agar semua proses tetap terpantau."}</p>{!search && filter === "Semua" && <Button onClick={openCreate}><Plus /> Tambah lamaran</Button>}</div>}
          </div>
        </div>

        <TipCard />
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
        </div><div><Label htmlFor="url">Tautan lowongan</Label><Input id="url" type="url" value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} placeholder="https://..." /></div><div><Label htmlFor="notes">Catatan</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Kontak recruiter, persiapan wawancara, atau hal penting lainnya..." rows={4} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button><Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : editing ? "Simpan perubahan" : "Tambah lamaran"}</Button></DialogFooter></form>
      </DialogContent></Dialog>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}><DialogContent className="sm:max-w-md"><DialogHeader><div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-[#fff0b8] text-[#0d3989]"><UserRound /></div><DialogTitle>{authMode === "sign-up" ? "Buat akun Jejak Karier" : authMode === "forgot" ? "Lupa kata sandi?" : "Masuk ke Jejak Karier"}</DialogTitle><DialogDescription>{authMode === "sign-up" ? "Simpan lamaranmu dengan aman dan akses dari perangkat mana pun." : authMode === "forgot" ? "Masukkan email akunmu. Kami akan mengirim tautan untuk membuat kata sandi baru." : "Masuk untuk melihat dan memperbarui lamaranmu dari perangkat mana pun."}</DialogDescription></DialogHeader>
        {authMode === "forgot" && resetSent ? <div className="application-form"><p className="reset-sent"><Check /><span>Jika email <b>{authEmail.trim()}</b> terdaftar, tautan atur ulang kata sandi sudah dikirim. Cek kotak masuk atau folder spam, tautannya berlaku 1 jam.</span></p><DialogFooter><Button type="button" onClick={() => openAuth("sign-in")}>Kembali ke halaman masuk</Button></DialogFooter></div> : <form onSubmit={submitAuth} className="application-form">{authMode === "sign-up" && <div><Label htmlFor="auth-name">Nama</Label><Input id="auth-name" required value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="Namamu" /></div>}<div><Label htmlFor="auth-email">Email</Label><Input id="auth-email" type="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="nama@email.com" /></div>{authMode !== "forgot" && <div><div className="flex items-center justify-between"><Label htmlFor="auth-password">Kata sandi</Label>{authMode === "sign-in" && <button type="button" className="forgot-link" onClick={() => openAuth("forgot")}>Lupa kata sandi?</button>}</div><Input id="auth-password" type="password" required minLength={8} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Minimal 8 karakter" /></div>}{authError && <p className="import-error"><CircleAlert /> {authError}</p>}<DialogFooter className="gap-3 sm:justify-between"><Button type="button" variant="ghost" onClick={() => openAuth(authMode === "sign-in" ? "sign-up" : "sign-in")}>{authMode === "sign-in" ? "Buat akun" : authMode === "forgot" ? "Kembali ke halaman masuk" : "Sudah punya akun? Masuk"}</Button><Button type="submit" disabled={authSaving}>{authSaving ? "Memproses..." : authMode === "sign-up" ? "Daftar" : authMode === "forgot" ? "Kirim tautan" : "Masuk"}</Button></DialogFooter></form>}
      </DialogContent></Dialog>

      <Sheet open={Boolean(selectedApplication)} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selectedApplication && <>
            <SheetHeader className="detail-header">
              <div className="detail-avatar">{selectedApplication.company.slice(0, 1).toUpperCase()}</div>
              <div><SheetTitle className="detail-title">{selectedApplication.role}</SheetTitle><SheetDescription className="detail-company"><Building2 /> {selectedApplication.company}</SheetDescription></div>
              <span className={`status-pill ${statusStyle[selectedApplication.status]}`}>{selectedApplication.status}</span>
            </SheetHeader>
            <div className="detail-body">
              <section className="detail-section"><p className="detail-label">RINGKASAN</p><div className="detail-grid"><div><span>Lokasi</span><strong>{selectedApplication.location || "Belum diisi"}</strong></div><div><span>Cara kerja</span><strong>{selectedApplication.workMode}</strong></div><div><span>Tanggal dilamar</span><strong>{dateLabel(selectedApplication.appliedDate)}</strong></div>{selectedApplication.salary && <div><span>Rentang gaji</span><strong>{selectedApplication.salary}</strong></div>}</div></section>
              {selectedApplication.notes && <section className="detail-section"><p className="detail-label">CATATAN</p><p className="detail-notes">{selectedApplication.notes}</p></section>}
              {selectedApplication.jobUrl && <section className="detail-section"><p className="detail-label">LOWONGAN ASLI</p><a className="detail-link" href={selectedApplication.jobUrl} target="_blank" rel="noreferrer"><span>{selectedApplication.jobUrl}</span><ArrowUpRight /></a></section>}
              <section className="detail-section"><p className="detail-label">PERBARUI STATUS</p><NativeSelect className="w-full" value={selectedApplication.status} disabled={updatingId === selectedApplication.id} onChange={(event) => void updateStatus(selectedApplication, event.target.value as Status)}>{statuses.map((status) => <NativeSelectOption key={status} value={status}>{status}</NativeSelectOption>)}</NativeSelect></section>
            </div>
            <SheetFooter className="detail-footer"><Button variant="outline" onClick={() => { openEdit(selectedApplication); setSelectedApplication(null); }}><Pencil /> Edit</Button><Button variant="destructive" onClick={() => { setDeleteTarget(selectedApplication); setSelectedApplication(null); }}><Trash2 /> Hapus</Button></SheetFooter>
          </>}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus lamaran ini?</AlertDialogTitle><AlertDialogDescription>Catatan untuk {deleteTarget?.role} di {deleteTarget?.company} akan dihapus permanen.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={removeApplication}>Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </main>
  );
}

declare global {
  interface Document {
    modelContext?: { registerTool: (tool: Record<string, unknown>, options?: { signal?: AbortSignal }) => void | Promise<void> };
  }
}
