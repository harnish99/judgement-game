"use client";

/**
 * TurnTimer — visual countdown component.
 *
 * Renders an SVG ring that depletes clockwise as time runs out.
 * Colour shifts yellow → orange → red with a pulse in danger state.
 * Accepts the plain TurnTimerState returned by useTurnTimer so the UI stays
 * fully decoupled from the hook.
 */

import type { TurnTimerState } from "@/hooks/useTurnTimer";

const URGENCY_COLORS = {
  normal:  { ring: "#eab308", text: "#eab308" }, // yellow-500
  warning: { ring: "#f97316", text: "#f97316" }, // orange-500
  danger:  { ring: "#ef4444", text: "#ef4444" }, // red-500
} as const;

interface TurnTimerProps extends TurnTimerState {
  /** Outer diameter in px. Defaults to 44. */
  size?: number;
  className?: string;
}

export default function TurnTimer({
  timeRemaining,
  fraction,
  urgency,
  size = 44,
  className = "",
}: TurnTimerProps) {
  const strokeWidth = size * 0.12;          // ~12 % of diameter
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - fraction);
  const { ring, text } = URGENCY_COLORS[urgency];

  // Pulse wrapper only in danger state
  const pulse = urgency === "danger" ? "animate-pulse" : "";

  return (
    <div
      className={`inline-flex items-center justify-center ${pulse} ${className}`}
      role="timer"
      aria-label={`${timeRemaining} seconds remaining`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ display: "block" }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#374151" /* gray-700 */
          strokeWidth={strokeWidth}
        />
        {/* Progress ring — starts at 12 o'clock, depletes clockwise */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.3s ease" }}
        />
        {/* Countdown number */}
        <text
          x={cx}
          y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          fill={text}
          fontSize={size * 0.33}
          fontWeight="700"
          fontFamily="ui-monospace, monospace"
          style={{ transition: "fill 0.3s ease" }}
        >
          {timeRemaining}
        </text>
      </svg>
    </div>
  );
}
