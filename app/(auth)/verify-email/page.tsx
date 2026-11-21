import type { Metadata } from "next";
import { VerifyEmailPanel } from "./verify-email-panel";

export const metadata: Metadata = { title: "Verify Email | Metrispot" };
export const instant = false;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailPanel token={token ?? ""} />;
}
