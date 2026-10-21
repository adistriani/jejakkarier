import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/auth-schema";
import { getAppBaseUrl } from "@/lib/base-url";
import { sendEmail } from "@/lib/email";

const baseURL = getAppBaseUrl();
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Atur ulang kata sandi Jejak Karier",
        text: `Halo ${user.name || ""},\n\nBuka tautan ini untuk membuat kata sandi baru (berlaku 1 jam):\n${url}\n\nAbaikan email ini jika kamu tidak memintanya.`,
        html: `<p>Halo ${escapeHtml(user.name || "")},</p><p>Klik tombol di bawah untuk membuat kata sandi baru. Tautan ini berlaku 1 jam.</p><p><a href="${url}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#1555d6;color:#fff;text-decoration:none;font-weight:700">Atur ulang kata sandi</a></p><p style="color:#667085">Abaikan email ini jika kamu tidak memintanya.</p>`,
      });
    },
  },
  trustedOrigins: [...new Set(["http://localhost:3000", baseURL])],
  plugins: [nextCookies()],
});
