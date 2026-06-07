import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 max-w-sm mx-auto text-center">
      <span className="text-5xl">🃏</span>
      <h2 className="text-lg font-bold text-white">Page not found</h2>
      <p className="text-sm text-gray-400">
        That page doesn&apos;t exist. The room may have expired or the link is
        mistyped.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
