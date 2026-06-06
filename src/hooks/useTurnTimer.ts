"use client";

/**
 * useTurnTimer — pure timer logic, decoupled from UI.
 *
 * Multiplayer-ready: pass `turnStartTime` (server epoch ms) and `turnDuration`
 * to synchronise all clients to the same countdown. Without those the timer
 * starts locally from the moment `enabled` first becomes true.
 *
 * Pause behaviour: set `enabled: false` to freeze and reset the timer (use
 * this during animations, between-tricks, round-result, match-complete, etc.).
 */

import { useEffect, useRef, useState } from "react";

export type TimerUrgency = "normal" | "warning" | "danger";

export interface TurnTimerState {
  /** Whole seconds remaining (ceil), 0 when expired. */
  timeRemaining: number;
  /** 1 → 0 as the timer counts down. Use for ring/bar fill. */
  fraction: number;
  urgency: TimerUrgency;
}

interface UseTurnTimerOptions {
  /** Total duration in seconds (e.g. 30 for bidding, 20 for playing). */
  duration: number;
  /** When false the timer is paused and reset. */
  enabled: boolean;
  /** Fired exactly once when the timer reaches zero. */
  onExpire: () => void;
  /** Fired exactly once when timeRemaining first drops to ≤ 5 s. */
  onWarning?: () => void;
  /**
   * Server-authoritative turn start (Date.now() ms).
   * When provided the timer derives remaining time from the wall clock so all
   * clients stay in sync even if they joined mid-turn.
   */
  turnStartTime?: number;
  /**
   * Server-authoritative duration override (seconds).
   * Falls back to `duration` when omitted.
   */
  turnDuration?: number;
}

export function useTurnTimer({
  duration,
  enabled,
  onExpire,
  onWarning,
  turnStartTime,
  turnDuration,
}: UseTurnTimerOptions): TurnTimerState {
  const effectiveDuration = turnDuration ?? duration;

  // Keep callbacks in refs so the interval never captures a stale closure.
  const onExpireRef = useRef(onExpire);
  const onWarningRef = useRef(onWarning);
  onExpireRef.current = onExpire;
  onWarningRef.current = onWarning;

  const startTimeRef = useRef<number | null>(null);
  const firedExpireRef = useRef(false);
  const firedWarningRef = useRef(false);

  const [timeRemaining, setTimeRemaining] = useState(effectiveDuration);

  useEffect(() => {
    if (!enabled) {
      // Reset everything when paused.
      startTimeRef.current = null;
      firedExpireRef.current = false;
      firedWarningRef.current = false;
      setTimeRemaining(effectiveDuration);
      return;
    }

    // Anchor: prefer server time, fall back to now.
    startTimeRef.current = turnStartTime ?? Date.now();
    firedExpireRef.current = false;
    firedWarningRef.current = false;

    const tick = () => {
      const elapsed = (Date.now() - startTimeRef.current!) / 1000;
      const remaining = Math.max(0, effectiveDuration - elapsed);
      setTimeRemaining(remaining);

      if (!firedWarningRef.current && remaining <= 5) {
        firedWarningRef.current = true;
        onWarningRef.current?.();
      }

      if (!firedExpireRef.current && remaining <= 0) {
        firedExpireRef.current = true;
        onExpireRef.current();
      }
    };

    // Run immediately so the displayed value is correct from frame 1.
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, turnStartTime, effectiveDuration]);

  const urgency: TimerUrgency =
    timeRemaining <= 5 ? "danger" :
    timeRemaining <= 10 ? "warning" :
    "normal";

  return {
    timeRemaining: Math.ceil(timeRemaining),
    fraction: effectiveDuration > 0
      ? Math.max(0, Math.min(1, timeRemaining / effectiveDuration))
      : 0,
    urgency,
  };
}
