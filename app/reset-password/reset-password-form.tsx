"use client";

import { FormEvent, useState } from "react";
import { BriefcaseBusiness, Check, CircleAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token, invalid }: { token: string; invalid: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const usable = Boolean(token) && !invalid;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("Konfirmasi kata sandi tidak sama."); return; }
    setSaving(true); setError("");
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.code === "INVALID_TOKEN" ? "Tautan sudah kedaluwarsa atau pernah dipakai. Minta tautan baru dari halaman masuk." : result.error.message || "Kata sandi belum dapat diubah.");
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kata sandi belum dapat diubah.");
    } finally { setSaving(false); }
  }

  return (
    <main className="reset-shell">
      <a href="/" className="reset-brand"><div className="brand-mark"><BriefcaseBusiness aria-hidden="true" /></div><div><p className="brand-name">Jejak Karier</p><p className="brand-kicker">TRACKER LAMARAN</p></div></a>
      <section className="reset-card">
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-[#fff0b8] text-[#0d3989]">{done ? <Check /> : <KeyRound />}</div>
        {done ? (
          <>
            <h1>Kata sandi berhasil diubah</h1>
            <p>Silakan masuk kembali memakai kata sandi barumu.</p>
            <Button asChild className="mt-6 w-full"><a href="/?masuk=1">Masuk ke Jejak Karier</a></Button>
          </>
        ) : usable ? (
          <>
            <h1>Buat kata sandi baru</h1>
            <p>Gunakan minimal 8 karakter yang mudah kamu ingat, tapi sulit ditebak orang lain.</p>
            <form onSubmit={submit} className="application-form mt-6">
              <div><Label htmlFor="new-password">Kata sandi baru</Label><Input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimal 8 karakter" /></div>
              <div><Label htmlFor="confirm-password">Ulangi kata sandi baru</Label><Input id="confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Ketik ulang kata sandi" /></div>
              {error && <p className="import-error"><CircleAlert /> {error}</p>}
              <Button type="submit" disabled={saving} className="w-full">{saving ? "Menyimpan..." : "Simpan kata sandi baru"}</Button>
            </form>
          </>
        ) : (
          <>
            <h1>Tautan tidak berlaku</h1>
            <p>Tautan atur ulang kata sandi sudah kedaluwarsa atau tidak valid. Minta tautan baru lewat menu &ldquo;Lupa kata sandi?&rdquo; di halaman masuk.</p>
            <Button asChild className="mt-6 w-full"><a href="/?masuk=1">Kembali ke halaman masuk</a></Button>
          </>
        )}
      </section>
    </main>
  );
}
