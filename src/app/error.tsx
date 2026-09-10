"use client";

// Global error boundary. Deliberately generic — never renders the error object
// or a stack trace to the user. The real error is logged server-side by Next.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">
        Something went wrong
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900">
        We hit an unexpected error
      </h1>
      <p className="mt-3 max-w-md text-navy-600">
        Please try again. If the problem continues, contact us and we will help.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-full bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
      >
        Try again
      </button>
    </main>
  );
}
