"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import PlayerCountPicker from "@/components/PlayerCountPicker";
import type { PlayerCount } from "@/game/types";

type Tab = "create" | "join";

export default function LobbyPage() {
  const router = useRouter();
  const { create, join, connectionStatus } = useRoom();

  const [tab, setTab] = useState<Tab>("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState<PlayerCount>(4);
  const [loading, setLoading] = useState(false);
  // Local error so it clears on tab switch and doesn't bleed from reconnect
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = loading || connectionStatus === "connecting";

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setLocalError(null);
    setLoading(true);
    try {
      const roomCode = await create(name.trim(), maxPlayers);
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || code.trim().length !== 6 || busy) return;
    setLocalError(null);
    setLoading(true);
    try {
      const roomCode = await join(code.trim(), name.trim());
      router.push(`/room/${roomCode}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 max-w-sm mx-auto">
      {/* Header */}
      <div className="w-full flex items-center gap-3 mb-8 flex-shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white transition-colors text-lg"
          aria-label="Back"
        >
          ‹
        </button>
        <div>
          <h1 className="text-xl font-bold text-yellow-400 leading-none">Multiplayer</h1>
          <p className="text-xs text-gray-500 mt-0.5">Play with friends</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
        {(["create", "join"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setLocalError(null); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-yellow-500 text-gray-900 shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t === "create" ? "Create Room" : "Join Room"}
          </button>
        ))}
      </div>

      {/* Create form */}
      {tab === "create" && (
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="create-name"
              className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide"
            >
              Your Name
            </label>
            <input
              id="create-name"
              type="text"
              maxLength={20}
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Player count selector */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
              Players
            </label>
            <PlayerCountPicker value={maxPlayers} onChange={setMaxPlayers} />
          </div>

          <p className="text-xs text-gray-500 -mt-1">
            A 6-character code will be generated for you to share with friends.
          </p>

          {localError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-2.5">
              {localError}
            </p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || busy}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mt-2 ${
              name.trim() && !busy
                ? "bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {busy ? "Creating…" : "Create Room"}
          </button>
        </form>
      )}

      {/* Join form */}
      {tab === "join" && (
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="join-name"
              className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide"
            >
              Your Name
            </label>
            <input
              id="join-name"
              type="text"
              maxLength={20}
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none transition-colors"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="join-code"
              className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide"
            >
              Room Code
            </label>
            <input
              id="join-code"
              type="text"
              maxLength={6}
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border border-gray-700 focus:border-yellow-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 font-mono text-xl tracking-widest outline-none transition-colors uppercase"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {localError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-2.5">
              {localError}
            </p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || code.trim().length !== 6 || busy}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all mt-2 ${
              name.trim() && code.trim().length === 6 && !busy
                ? "bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {busy ? "Joining…" : "Join Room"}
          </button>
        </form>
      )}
    </main>
  );
}
