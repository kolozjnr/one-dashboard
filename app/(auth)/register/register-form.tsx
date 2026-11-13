"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthAlert } from "@/components/auth/auth-alert";
import { AuthInputField } from "@/components/auth/auth-input-field";
import { setFlash } from "@/lib/flash";

/**
 * Registration form — ported from user/register.blade.php.
 * On success the reference redirects to /login flashing the API's message;
 * here the message travels via the flash helper. The Google button is a
 * GET to /sign-with-google in the reference (its controller body is
 * commented out — kept as the same URL, faithful dead end). The name field
 * keeps the reference's envelope icon, and its label reads `for="email"`
 * in Blade (corrected invisibly to `for="name"`).
 */
export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Mirrors the reference's Laravel validation (min:8 + confirmed)
    const validationErrors: string[] = [];
    if (!name) validationErrors.push("The name field is required.");
    else if (name.length > 255)
      validationErrors.push("The name field must not be greater than 255 characters.");
    if (!email) validationErrors.push("The email field is required.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      validationErrors.push("The email field must be a valid email address.");
    if (!password) validationErrors.push("The password field is required.");
    else if (password.length < 8)
      validationErrors.push("The password field must be at least 8 characters.");
    if (!confirmPassword)
      validationErrors.push("The password confirmation field is required.");
    else if (confirmPassword.length < 8)
      validationErrors.push(
        "The password confirmation field must be at least 8 characters.",
      );
    else if (confirmPassword !== password)
      validationErrors.push("The password confirmation does not match.");

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: confirmPassword,
        }),
      });
      const data = await response.json().catch(() => null);

      if (response.ok) {
        // Reference: redirect()->route('user.login')->with('success', $responseData['message'])
        setFlash(data?.message ?? "Registration successful.");
        window.location.href = "/login";
        return;
      }
      setErrors([
        data?.message ??
          "API registration failed. Please try again.",
      ]);
    } catch {
      setErrors([
        "An error occurred while communicating with the registration service.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full lg:w-1/2 min-h-screen overflow-y-auto bg-surface px-4">
      <div className="w-full max-w-md mx-auto py-12">
        <h2 className="text-2xl font-semibold text-ink mb-2">Sign Up</h2>
        <p className="text-muted mb-8">
          Enter your credentials to access your account
        </p>

        {/* Server feedback to the user */}
        <AuthAlert
          errors={errors}
          wrapperClassName="space-y-4 max-w-2xl mx-auto"
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name (reference shows the envelope icon here too) */}
          <AuthInputField
            id="name"
            label="NAME"
            type="text"
            name="name"
            autoComplete="name"
            value={name}
            onChange={setName}
          />

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
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />

          {/* Confirm Password */}
          <AuthInputField
            id="confirm-password"
            label="CONFIRM PASSWORD"
            type="password"
            name="password_confirmation"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />

          {/* Agree to Terms */}
          <div className="flex items-center">
            <input
              id="terms"
              type="checkbox"
              name="terms"
              required
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-line-strong rounded-sm"
            />
            <label
              htmlFor="terms"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              By signing up, you agree to the{" "}
              <a href="#" className="text-orange-600 hover:text-orange-700">
                Terms &amp; Conditions
              </a>{" "}
              and{" "}
              <a href="#" className="text-orange-600 hover:text-orange-700">
                Policy
              </a>
            </label>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70"
          >
            Create Account
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

        {/* Social Login Buttons */}
        <div className="mt-6 space-y-4">
          {/* Reference: a GET form to route('user.google') (/sign-with-google) */}
          <a
            href="/sign-with-google"
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
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-orange-600 hover:text-orange-500"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
