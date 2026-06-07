"use client";

import { useEffect } from "react";

/**
 * Top-level error boundary that also catches errors thrown in the root layout.
 * Must render its own <html>/<body> because it replaces the entire tree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fatal app error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-gray-900 text-white antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-6 max-w-sm mx-auto text-center">
          <span className="text-5xl">⚠️</span>
          <h2 className="text-lg font-bold">The app crashed</h2>
          <p className="text-sm text-gray-400">
            Please reload to continue. If this keeps happening, clear the app data
            and try again.
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full text-sm"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
