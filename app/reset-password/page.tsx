import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi — Jejak Karier" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} invalid={error === "INVALID_TOKEN"} />;
}
