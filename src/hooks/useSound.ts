"use client";

import { useCallback, useSyncExternalStore } from "react";

const MUTE_KEY = "judgement-mute";

// Shared across every useSound() instance — the Web Audio spec allows only a
// handful of live AudioContexts per page, and every component that wants to
// play a sound (game screens, the global UI-click listener, etc.) calls this
// hook. A module-level singleton avoids exhausting that budget and the
// "autoplay" suspended-state dance happening redundantly in each instance.
let sharedCtx: AudioContext | null = null;

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  } catch {}
}

// ─── Shared mute store ───────────────────────────────────────────────────────
//
// `muted` must be consistent across every useSound() instance — the toggle
// lives on one screen (e.g. the in-game mute button), but other always-mounted
// consumers (UiClickSound's global tap-sound listener) must respect it too.
// Per-instance useState would let them drift out of sync the moment more than
// one consumer exists. A tiny module-level store + useSyncExternalStore keeps
// every instance subscribed to the same boolean, recomputed lazily on first
// access (so SSR sees `false`, matching loadMuted()'s try/catch fallback).

let mutedState: boolean | null = null; // null = not yet loaded from storage
const mutedListeners = new Set<() => void>();

function getMutedSnapshot(): boolean {
  if (mutedState === null) mutedState = loadMuted();
  return mutedState;
}

function getMutedServerSnapshot(): boolean {
  return false; // SSR has no localStorage; first client render reconciles via the store
}

function subscribeMuted(listener: () => void): () => void {
  mutedListeners.add(listener);
  return () => mutedListeners.delete(listener);
}

function setMutedShared(next: boolean) {
  mutedState = next;
  saveMuted(next);
  mutedListeners.forEach((l) => l());
}

export function useSound() {
  const muted = useSyncExternalStore(subscribeMuted, getMutedSnapshot, getMutedServerSnapshot);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!sharedCtx) {
      sharedCtx = new AudioContext();
    }
    if (sharedCtx.state === "suspended") {
      sharedCtx.resume();
    }
    return sharedCtx;
  }, []);

  const toggleMute = useCallback(() => {
    setMutedShared(!getMutedSnapshot());
  }, []);

  const playTone = useCallback(
    (
      frequency: number,
      startTime: number,
      duration: number,
      gainPeak: number,
      type: OscillatorType = "sine"
    ) => {
      const ctx = getCtx();
      if (!ctx || muted) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime + startTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(gainPeak, ctx.currentTime + startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startTime + duration);
      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    },
    [getCtx, muted]
  );

  /**
   * Soft, neutral "tap" — played on every interactive UI button press
   * (see UiClickSound). Deliberately quiet and short (~35 ms) so it reads as
   * tactile feedback rather than a distinct game event, and layers cleanly
   * under the louder, longer game-action sounds below without muddying them.
   */
  const playClickSound = useCallback(() => {
    playTone(700, 0, 0.035, 0.06, "triangle");
  }, [playTone]);

  const playCardSound = useCallback(() => {
    playTone(800, 0, 0.08, 0.15, "square");
    playTone(400, 0.02, 0.06, 0.08, "square");
  }, [playTone]);

  const playTrickWonSound = useCallback(() => {
    // Short ascending arpeggio
    [523, 659, 784, 1047].forEach((f, i) => {
      playTone(f, i * 0.08, 0.12, 0.18);
    });
  }, [playTone]);

  const playRoundCompleteSound = useCallback(() => {
    [523, 659, 784, 659, 1047].forEach((f, i) => {
      playTone(f, i * 0.1, 0.18, 0.2);
    });
  }, [playTone]);

  const playGameWonSound = useCallback(() => {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => {
      playTone(f, i * 0.12, 0.22, 0.25);
    });
  }, [playTone]);

  /** Two sharp ticks — played at the 5-second warning. */
  const playTimerWarningSound = useCallback(() => {
    playTone(1200, 0,    0.06, 0.2, "square");
    playTone(1200, 0.12, 0.06, 0.2, "square");
  }, [playTone]);

  /** Short descending buzz — played when a turn timer expires. */
  const playTimerExpireSound = useCallback(() => {
    playTone(600, 0,    0.08, 0.25, "sawtooth");
    playTone(400, 0.08, 0.12, 0.2,  "sawtooth");
    playTone(250, 0.18, 0.15, 0.15, "sawtooth");
  }, [playTone]);

  return {
    muted,
    toggleMute,
    playClickSound,
    playCardSound,
    playTrickWonSound,
    playRoundCompleteSound,
    playGameWonSound,
    playTimerWarningSound,
    playTimerExpireSound,
  };
}
