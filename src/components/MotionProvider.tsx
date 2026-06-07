"use client";

import { MotionConfig } from "framer-motion";

/**
 * Wraps the app so all Framer Motion animations honour the user's
 * `prefers-reduced-motion` setting (WCAG 2.3.3 — Animation from Interactions).
 * `reducedMotion="user"` disables transform/layout animations for users who
 * opt out, while keeping opacity changes.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
