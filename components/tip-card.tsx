"use client";

import { useState } from "react";
import { Check, Coffee, Copy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GOPAY_NUMBER = "08998111648";
const GOPAY_DISPLAY = "0899-8111-648";

export function TipCard() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(GOPAY_NUMBER);
    } catch {
      const input = document.createElement("input");
      input.value = GOPAY_NUMBER;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <aside className="tip-card mt-6">
        <div className="tip-icon"><Coffee aria-hidden="true" /></div>
        <div className="tip-copy">
          <p className="section-kicker">DUKUNG JEJAK KARIER</p>
          <h2>Suka dengan Jejak Karier?</h2>
          <p>Traktir kopi lewat GoPay supaya aplikasi ini terus berkembang dan tetap gratis.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="add-button tip-button h-11 rounded-xl px-5"><Coffee aria-hidden="true" /> Traktir kopi</Button>
      </aside>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-2xl bg-[#fff0b8] text-[#0d3989]"><Coffee /></div>
            <DialogTitle>Traktir kopi via GoPay</DialogTitle>
            <DialogDescription>Kirim tip berapa pun ke nomor GoPay di bawah ini.</DialogDescription>
          </DialogHeader>
          <div className="tip-number">
            <div><span>Nomor GoPay</span><strong>{GOPAY_DISPLAY}</strong></div>
            <Button type="button" variant="outline" onClick={() => void copyNumber()}>{copied ? <><Check /> Tersalin</> : <><Copy /> Salin</>}</Button>
          </div>
          <ol className="tip-steps">
            <li>Buka aplikasi Gojek, pilih <b>Bayar</b> atau <b>Kirim</b> di GoPay.</li>
            <li>Tempel nomor <b>{GOPAY_DISPLAY}</b>, lalu masukkan nominal tip.</li>
            <li>Konfirmasi pembayaran, selesai!</li>
          </ol>
          <p className="tip-thanks"><Heart aria-hidden="true" /> Terima kasih, semoga cepat keterima kerjanya ya!</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
