"use client";

import { useState } from "react";

/**
 * Auth form field — ported from the input markup shared by the reference
 * auth pages (label + rounded-md input + right-hand icon).
 * Non-password fields show the reference's envelope icon; password fields
 * show the eye toggle (the reference wires this with inline JS — here it is
 * React state). Dark input surface is an adaptation for the added dark mode;
 * light mode matches the reference exactly.
 */
export function AuthInputField({
  id,
  label,
  type,
  name,
  required = true,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  name: string;
  required?: boolean;
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          name={name}
          required={required}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full px-3 py-2 border border-line-strong rounded-md bg-surface dark:bg-sunken text-ink focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
        {isPassword ? (
          <button
            type="button"
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
            className="group absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-ghost transition-colors duration-200 hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className={`h-5 w-5 transition-transform duration-200 ease-out group-active:scale-90 ${revealed ? "scale-110 text-brand" : "scale-100"}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              {!revealed && <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" className="origin-center animate-in" />}
            </svg>
          </button>
        ) : (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 text-ghost"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
