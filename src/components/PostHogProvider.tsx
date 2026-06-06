"use client";

/**
 * PostHogProvider
 *
 * Mounts once at the root of the app and initialises the analytics
 * service when the component is hydrated in the browser.  Renders
 * nothing visible — pure side-effect component.
 *
 * Placed in layout.tsx so it wraps every page without re-mounting on
 * client-side navigation.
 */

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

export default function PostHogProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  return null;
}
