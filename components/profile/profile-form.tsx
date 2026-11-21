"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiClientError, apiRequest } from "@/lib/api-client";

type Profile = { id: string; email: string; profile?: { displayName?: string | null; avatarUrl?: string | null } | null };

export function ProfileForm() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<Profile>("auth/me").then((result) => {
      setProfile(result);
      setName(result.profile?.displayName ?? "");
    }).catch((reason: unknown) => setError(reason instanceof ApiClientError ? reason.message : "Sign in to load your profile.")).finally(() => setBusy(false));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const updated = await apiRequest<Profile>("users/me", { method: "PATCH", body: { displayName: name.trim() } });
      setProfile(updated); setName(updated.profile?.displayName ?? name.trim()); setMessage("Profile saved.");
    } catch (reason) { setError(reason instanceof ApiClientError ? reason.message : "Could not save your profile."); }
    finally { setSaving(false); }
  }

  if (busy) return <p className="text-sm text-faint">Loading your profile…</p>;
  return <form onSubmit={save} className="max-w-2xl space-y-6">
    <div className="flex items-center gap-4"><div className="grid size-16 place-items-center rounded-full bg-brand/10 text-xl font-semibold text-brand">{name.slice(0, 1).toUpperCase() || "U"}</div><div><p className="font-medium text-ink">Profile photo</p><p className="text-sm text-faint">Photo uploads are not enabled yet.</p></div></div>
    <label className="block text-sm font-medium text-muted">Full name<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-surface px-3 text-ink" /></label>
    <label className="block text-sm font-medium text-muted">Email address<input readOnly value={profile?.email ?? ""} className="mt-1.5 h-10 w-full rounded-lg border border-line bg-sunken px-3 text-ink" /><span className="mt-1 block text-xs text-faint">Email changes require verification.</span></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}{message && <p role="status" className="text-sm text-green-700">{message}</p>}
    <button disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
  </form>;
}
