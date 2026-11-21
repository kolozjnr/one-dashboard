"use client";

import Link from "next/link";
import { useState } from "react";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { SubmitSpinner } from "@/components/auth/submit-spinner";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true); setError("");
    try { await apiRequest("invitations/" + encodeURIComponent(token) + "/accept", { method: "POST" }); setMessage("Invitation accepted. You can now open your workspace."); }
    catch (reason) { setError(reason instanceof ApiClientError ? reason.message : "Could not accept this invitation."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6"><h1 className="text-2xl font-semibold text-ink">Join a workspace</h1><p className="mt-2 text-sm text-muted">Sign in with the email address that received this invitation, then accept to join.</p>{error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}{message ? <p role="status" className="mt-4 text-sm text-green-700">{message} <Link className="underline" href="/workspace">Open workspace</Link></p> : <div className="mt-6 flex gap-3"><button disabled={busy} aria-busy={busy} onClick={accept} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy && <SubmitSpinner />}{busy ? "Accepting…" : "Accept invitation"}</button><Link href="/login" className="rounded-lg border border-line px-4 py-2 text-sm">Sign in</Link></div>}</main>;
}
