import type { Suit } from "./types";

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/**
 * Four-color suit scheme — the convention most digital card platforms
 * (online poker rooms, bridge software) switched to because the
 * traditional two-color deck makes hearts indistinguishable from
 * diamonds, and clubs from spades, at small sizes or a glance. Giving
 * each suit its own hue lets players identify it from color alone,
 * without needing to resolve the glyph shape first.
 */
export const SUIT_COLORS_ON_LIGHT: Record<Suit, string> = {
  hearts: "text-red-600",
  diamonds: "text-blue-600",
  clubs: "text-green-600",
  spades: "text-gray-900",
};

export const SUIT_COLORS_ON_DARK: Record<Suit, string> = {
  hearts: "text-red-400",
  diamonds: "text-blue-400",
  clubs: "text-green-400",
  spades: "text-gray-300",
};
