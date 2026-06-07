"use client";

/**
 * UiClickSound
 *
 * Mounts once at the root of the app and plays a soft "tap" sound whenever
 * the user activates an interactive control — buttons, links, and anything
 * with role="button" — anywhere in the app. This is the kind of subtle
 * tactile feedback most polished mobile/card-game UIs have (Solitaire,
 * Hearthstone, etc.): every tap gets an immediate, quiet acknowledgement,
 * independent of whatever louder, game-specific sound effect may follow
 * (card play, trick won, round complete, …).
 *
 * Implementation notes:
 *  - A single delegated `pointerdown` listener on `document` (capture phase)
 *    means new buttons rendered anywhere — including inside dynamically
 *    mounted dialogs/screens — get the sound for free; nothing needs to wire
 *    it up individually.
 *  - `pointerdown` (not `click`) so the tap feels instantaneous rather than
 *    waiting for the full press-release cycle.
 *  - Respects the existing mute toggle via useSound() (shared AudioContext).
 *  - Elements can opt out with `data-no-click-sound` — e.g. controls that
 *    already trigger their own distinct sound effect on the same gesture and
 *    would otherwise double up (none currently need this, but the hook is
 *    here for future cases like a dedicated "deal" or "shuffle" button).
 *  - Renders nothing — pure side-effect component, same shape as
 *    PostHogProvider.
 */

import { useEffect } from "react";
import { useSound } from "@/hooks/useSound";

const INTERACTIVE_SELECTOR = 'button, [role="button"], a[href], input[type="submit"]';

export default function UiClickSound() {
  const { playClickSound } = useSound();

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (interactive.closest("[data-no-click-sound]")) return;
      if ((interactive as HTMLButtonElement).disabled) return;

      playClickSound();
    }

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [playClickSound]);

  return null;
}
