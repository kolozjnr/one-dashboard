"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import { SubmitSpinner } from "@/components/auth/submit-spinner";

export function VerifyEmailPanel({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest<{ message: string }>("auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then((result) => {
      if (active) setSuccess(result.message);
    }).catch((error: unknown) => {
      if (active) setErrors([error instanceof ApiClientError ? error.message : "Could not verify this email."]);
    });
    return () => { active = false; };
  }, [token]);

  async function resend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors([]);
    setSuccess(null);
    try {
      const result = await apiRequest<{ message: string }>("auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess(result.message);
    } catch (error) {
      setErrors([error instanceof ApiClientError ? error.message : "Could not submit the request."]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-surface px-4">
      <div className="w-full max-w-md mx-auto py-12">
        <h2 className="text-2xl font-semibold text-ink mb-2">Verify your email</h2>
        <p className="text-muted mb-8">Confirm your address to enable sign in.</p>
        <AuthAlert errors={errors} success={success} />
        {!token && <form onSubmit={resend} className="space-y-6">
          <AuthInputField id="email" label="EMAIL ADDRESS" type="email" name="email" autoComplete="email" value={email} onChange={setEmail} />
        <button type="submit" disabled={submitting} aria-busy={submitting} className="w-full flex justify-center py-3 px-4 rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-70">
            <span className="inline-flex items-center justify-center gap-2">{submitting && <SubmitSpinner />}<span>{submitting ? "Sending…" : "Resend verification email"}</span></span>
          </button>
        </form>}
        <p className="mt-6 text-center text-sm text-muted"><Link href="/login" className="font-medium text-orange-600">Continue to login</Link></p>
      </div>
    </div>
  );
}
