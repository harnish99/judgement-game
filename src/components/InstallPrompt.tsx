"use client";

import { useEffect, useState } from "react";

// Extend the Window type for the non-standard beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type PromptState =
  | "hidden"       // not shown yet / already dismissed
  | "android"      // Chrome/Edge install banner
  | "ios";         // iOS Safari instructions

const DISMISSED_KEY = "judgement-install-dismissed";

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|chrome/i.test(ua);
  return isIos && isSafari;
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  );
}

export default function InstallPrompt() {
  const [state, setState] = useState<PromptState>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Android/Chrome: listen for the browser's install event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari: show instructions if not already installed
    if (isIosSafari()) {
      // Small delay so it doesn't flash on first paint
      const t = setTimeout(() => setState("ios"), 2500);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setState("hidden");
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setState("hidden");
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  }

  if (state === "hidden") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div
        className="
          pointer-events-auto
          max-w-md mx-auto
          bg-gray-900 border border-gray-700
          rounded-2xl shadow-2xl
          overflow-hidden
          animate-in slide-in-from-bottom-4 duration-300
        "
      >
        {/* Android install banner */}
        {state === "android" && (
          <div className="flex items-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192x192.png"
              alt="Judgement icon"
              width={44}
              height={44}
              className="rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">
                Install Judgement
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Add to your home screen for the best experience
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={dismiss}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
              <button
                onClick={handleAndroidInstall}
                className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-sm transition-colors"
              >
                Install
              </button>
            </div>
          </div>
        )}

        {/* iOS Safari instructions */}
        {state === "ios" && (
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/icon-180x180.png"
                  alt="Judgement icon"
                  width={40}
                  height={40}
                  className="rounded-xl flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">
                    Add to Home Screen
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Install Judgement for offline play
                  </p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors text-lg"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Step-by-step */}
            <ol className="flex flex-col gap-2">
              <li className="flex items-center gap-2.5 text-xs text-gray-300">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
                Tap the
                <span className="inline-flex items-center gap-1 bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200">
                  <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden="true">
                    <path d="M6.5 1v9M3 4l3.5-3L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="1" y="7" width="11" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  Share
                </span>
                button at the bottom
              </li>
              <li className="flex items-center gap-2.5 text-xs text-gray-300">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
                Scroll down and tap
                <span className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200 whitespace-nowrap">Add to Home Screen</span>
              </li>
              <li className="flex items-center gap-2.5 text-xs text-gray-300">
                <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
                Tap <span className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-gray-200">Add</span> in the top right
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
