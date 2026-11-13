"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { consumeFlash } from "@/lib/flash";
import { setToken } from "@/lib/auth";

/**
 * Login form — ported from user/login.blade.php.
 * Server feedback comes from client-side validation (mirroring the
 * reference's Laravel rules/messages) and the /api/login proxy response.
 * The success flash is consumed once (set by logout or registration).
 */
export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // One-shot read of a sessionStorage flash that only exists in the browser
    // (set before the full-page redirect from register/logout). Reading it
    // during render would mismatch the server HTML, so the mount effect is the
    // correct place; the single extra render it causes is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuccess(consumeFlash());
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Mirrors the reference's Laravel validation
    const validationErrors: string[] = [];
    if (!email) validationErrors.push("The email field is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      validationErrors.push("The email field must be a valid email address.");
    if (!password) validationErrors.push("The password field is required.");
    else if (password.length < 8)
      validationErrors.push("The password field must be at least 8 characters.");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setSuccess(null);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    setSuccess(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        const token = data?.data?.authorization?.token;
        if (!token) {
          setErrors([data?.message ?? "Login failed. Please try again."]);
        } else {
          setToken(token);
          try {
            if (data?.data?.user) {
              localStorage.setItem("user", JSON.stringify(data.data.user));
            }
          } catch {
            /* storage unavailable */
          }
          window.location.href = "/dashboard";
          return;
        }
      } else {
        setErrors([
          data?.message ?? "An error occurred while communicating with the login service.",
        ]);
      }
    } catch {
      setErrors([
        "An error occurred while communicating with the login service.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full lg:w-1/2 bg-surface px-4 overflow-y-auto text-sm">
      <div className="w-full max-w-md mx-auto py-12">
        <h2 className="text-2xl font-semibold text-ink mb-2">Log In</h2>
        <p className="text-muted mb-8">
          Enter your credentials to access your account
        </p>

        {/* Server feedback to the user */}
        <AuthAlert errors={errors} success={success} />

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

          {/* Password */}
          <AuthInputField
            id="password"
            label="PASSWORD"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember_me"
                type="checkbox"
                name="remember"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-line-strong rounded-sm"
              />
              <label
                htmlFor="remember_me"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Remember me for 30 days
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-orange-600 hover:text-orange-500"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70"
          >
            Log Into Account
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line-strong"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-faint">Or</span>
          </div>
        </div>

        {/* Social Login Buttons (reference links are broken routes — kept) */}
        <div className="mt-6 space-y-4">
          <a
            href="/auth/google"
            className="w-full flex items-center justify-center px-4 py-2 border border-line-strong rounded-md shadow-xs text-sm font-medium text-gray-700 dark:text-gray-300 bg-surface hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google logo"
              className="h-5 w-5 mr-2"
            />
            Continue with Google
          </a>
          <a
            href="/login/twitter"
            className="w-full flex items-center justify-center px-4 py-2 border border-line-strong rounded-md shadow-xs text-sm font-medium text-gray-700 dark:text-gray-300 bg-surface hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <svg
              className="h-5 w-5 mr-2 text-[#1DA1F2]"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
            Continue with Twitter
          </a>
        </div>

        {/* Sign Up Link */}
        <p className="mt-6 text-center text-sm text-muted">
          Are you new here?{" "}
          <Link
            href="/register"
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
