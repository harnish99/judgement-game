"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Catches render/runtime errors in any page and
 * offers recovery instead of a blank screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Hook for an exception tracker (e.g. Sentry.captureException(error)).
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 max-w-sm mx-auto text-center">
      <span className="text-5xl">😵</span>
      <h2 className="text-lg font-bold text-white">Something went wrong</h2>
      <p className="text-sm text-gray-400">
        An unexpected error interrupted the game. You can try again or head back to
        the menu.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-600 font-mono">ref: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 border border-gray-700 hover:border-gray-500 text-white font-bold rounded-full text-sm transition-colors"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
