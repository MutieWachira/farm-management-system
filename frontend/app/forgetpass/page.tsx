
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to process your request.",
        );
      }

      setMessage(
        "If an account exists with this email address, you will receive password reset instructions shortly.",
      );

      setEmail("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process your request.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-6 py-12">
      {/* =========================================================
          BACKGROUND DECORATION
      ========================================================== */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />

        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-green-200/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* =======================================================
            LOGO / BRAND
        ======================================================== */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-8 w-8 text-white"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21V10"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 14c-3.5 0-6-2.5-6-6 3.5 0 6 2.5 6 6Z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Z"
              />

              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 21h8"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Forgot your password?
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the email address associated with your
            AgriCore account and we'll help you reset your
            password.
          </p>
        </div>

        {/* =======================================================
            RESET CARD
        ======================================================== */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                {/* Email Icon */}
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 7.5 12 13l9-5.5"
                    />

                    <rect
                      width="18"
                      height="15"
                      x="3"
                      y="4.5"
                      rx="2"
                    />
                  </svg>
                </div>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                  placeholder="farmer@example.com"
                />
              </div>
            </div>

            {/* Success Message */}
            {message && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m8 12 2.5 2.5L16 9"
                  />
                </svg>

                <span>{message}</span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                  />

                  <path
                    strokeLinecap="round"
                    d="M12 8v4"
                  />

                  <path
                    strokeLinecap="round"
                    d="M12 16h.01"
                  />
                </svg>

                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition duration-200 hover:bg-emerald-700 hover:shadow-emerald-600/30 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg
                    className="mr-2 h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />

                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>

                  Sending instructions...
                </>
              ) : (
                <>
                  Send reset instructions

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="ml-2 h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m13 6 6 6-6 6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 12H5"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11 18-6-6 6-6"
                />
              </svg>

              Back to sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          AgriCore Farm Management System
        </p>
      </div>
    </main>
  );
}

