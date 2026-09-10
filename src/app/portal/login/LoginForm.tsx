"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { signIn, type AuthState } from "./actions";
import { SubmitButton } from "@/components/portal/SubmitButton";

const initial: AuthState = {};

export function LoginForm() {
  const [state, action] = useFormState(signIn, initial);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-navy-800">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2.5 text-navy-900 outline-none focus:border-navy-700"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-navy-800">
            Password
          </label>
          <Link
            href="/portal/reset"
            className="text-xs font-medium text-navy-600 hover:text-navy-900"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-navy-200 px-3 py-2.5 text-navy-900 outline-none focus:border-navy-700"
        />
      </div>

      <SubmitButton pendingText="Signing in…">Sign In</SubmitButton>
    </form>
  );
}
