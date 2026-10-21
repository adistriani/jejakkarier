type Email = { to: string; subject: string; html: string; text: string };

// Kirim email lewat Resend bila RESEND_API_KEY tersedia. Tanpa kunci, di mode
// development isi email dicetak ke log server agar alur tetap bisa diuji.
export async function sendEmail({ to, subject, html, text }: Email) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[email] Ke: ${to}\n[email] Subjek: ${subject}\n${text}\n`);
      return;
    }
    throw new Error("RESEND_API_KEY belum diatur, email tidak dapat dikirim.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Jejak Karier <onboarding@resend.dev>",
      to,
      subject,
      html,
      text,
    }),
  });
  if (!response.ok) throw new Error(`Gagal mengirim email (${response.status}): ${await response.text()}`);
}
