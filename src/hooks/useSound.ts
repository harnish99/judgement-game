"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_KEY = "judgement-mute";

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

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(loadMuted());
  }, []);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      saveMuted(next);
      return next;
    });
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

  return { muted, toggleMute, playCardSound, playTrickWonSound, playRoundCompleteSound, playGameWonSound };
}
