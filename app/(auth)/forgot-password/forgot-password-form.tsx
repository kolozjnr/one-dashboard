"use client";

import { useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthInputField } from "@/components/auth/auth-input-field";

/**
 * Forgot-password form — ported from user/forgot-password.blade.php.
 * Reference defect handled: the form posts to `action="#"`, which in Laravel
 * 404s (no POST route exists and no API endpoint backs it). The React form
 * validates and no-ops instead of navigating, and the reference's static
 * hint text under the button is kept verbatim (including the button label
 * "Log Into Account", which is what the Blade file says).
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors: string[] = [];
    if (!email) validationErrors.push("The email field is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      validationErrors.push("The email field must be a valid email address.");

    setErrors(validationErrors);
    // No endpoint exists in the reference (form action="#") — no further action.
  }

  return (
    <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-surface px-4">
      <div className="w-full max-w-md mx-auto py-12">
        <h2 className="text-2xl font-semibold text-ink mb-2">
          Reset Password
        </h2>
        <p className="text-muted mb-8">
          Enter your email to access your account
        </p>

        {/* Server feedback to the user */}
        <AuthAlert
          errors={errors}
          wrapperClassName="space-y-4 max-w-2xl mx-auto p-4"
        />

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <AuthInputField
            id="email"
            label="EMAIL ADDRESS"
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
          />

          {/* Submit Button (label verbatim from the reference) */}
          <button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Log Into Account
          </button>
          <div className="flex justify-center">
            <small className="text-orange-500 text-center">
              Check your E-mail for a password reset link
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}
