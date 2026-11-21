"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { SubmitSpinner } from "@/components/auth/submit-spinner";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: string[] = [];
    if (!token) nextErrors.push("This reset link is missing or invalid.");
    if (password.length < 12) nextErrors.push("Use at least 12 characters for your password.");
    if (password !== confirmation) nextErrors.push("The passwords do not match.");
    setErrors(nextErrors);
    setSuccess(null);
    if (nextErrors.length) return;

    setSubmitting(true);
    try {
      const result = await apiRequest<{ message: string }>("auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(result.message);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setErrors([error instanceof ApiClientError ? error.message : "Could not reset the password."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-surface px-4">
      <div className="w-full max-w-md mx-auto py-12">
        <h2 className="text-2xl font-semibold text-ink mb-2">Choose a new password</h2>
        <p className="text-muted mb-8">Use at least 12 characters to protect your account.</p>
        <AuthAlert errors={errors} success={success} />
        <form onSubmit={submit} className="space-y-6">
          <AuthInputField id="password" label="NEW PASSWORD" type="password" name="password" autoComplete="new-password" value={password} onChange={setPassword} />
          <AuthInputField id="confirm-password" label="CONFIRM PASSWORD" type="password" name="confirm-password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} />
          <button type="submit" disabled={submitting || !token} aria-busy={submitting} className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-70">
            <span className="inline-flex items-center justify-center gap-2">{submitting && <SubmitSpinner />}<span>{submitting ? "Saving…" : "Reset Password"}</span></span>
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted"><Link href="/login" className="font-medium text-orange-600">Return to login</Link></p>
      </div>
    </div>
  );
}
