"use client";

import { useCallback } from "react";

export function useHaptics() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const hapticCard = useCallback(() => vibrate(10), [vibrate]);
  const hapticTrickWon = useCallback(() => vibrate([30, 20, 30]), [vibrate]);

  return { hapticCard, hapticTrickWon };
}
