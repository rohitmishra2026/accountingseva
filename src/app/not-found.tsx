import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-navy-500">
        404
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-navy-900">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-navy-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
      >
        Back to home
      </Link>
    </main>
  );
}
