"use client";

import type { ConnectionStatus } from "@/lib/multiplayer/types";

interface ConnectionStatusProps {
  status: ConnectionStatus;
  className?: string;
}

const CONFIG: Record<
  ConnectionStatus,
  { label: string; dot: string; pulse: boolean }
> = {
  idle:         { label: "Not connected",  dot: "bg-gray-500",  pulse: false },
  connecting:   { label: "Connecting…",    dot: "bg-yellow-400", pulse: true  },
  reconnecting: { label: "Reconnecting…",  dot: "bg-yellow-400", pulse: true  },
  connected:    { label: "Connected",      dot: "bg-green-400",  pulse: false },
  disconnected: { label: "Disconnected",   dot: "bg-red-500",    pulse: false },
  error:        { label: "Connection error", dot: "bg-red-500",  pulse: false },
};

export default function ConnectionStatusBadge({
  status,
  className = "",
}: ConnectionStatusProps) {
  const { label, dot, pulse } = CONFIG[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs text-gray-400 ${className}`}
      role="status"
      aria-label={label}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
      </span>
      {label}
    </div>
  );
}
