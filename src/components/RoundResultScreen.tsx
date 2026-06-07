import type { MatchState } from "@/game/types";
import { totalRounds } from "@/game/match";
import { SUIT_SYMBOLS, SUIT_COLORS_ON_DARK as SUIT_COLORS } from "@/game/suits";

interface RoundResultScreenProps {
  match: MatchState;
  onNextRound: () => void;
  /** When false, hides the Next Round button and shows a waiting message. Defaults to true. */
  canAdvance?: boolean;
}

export default function RoundResultScreen({ match, onNextRound, canAdvance = true }: RoundResultScreenProps) {
  const round = match.currentRound!;
  const lastResult = match.roundHistory[match.roundHistory.length - 1];
  const { players } = round;
  const numRounds = totalRounds(match.playerCount);
  const isMatchDone = match.roundNumber >= numRounds;

  const humanHit = round.tricksWon[0] === (round.bids[0] ?? 0);

  // Sort leaderboard by cumulative score descending
  const leaderboard = [...players].sort(
    (a, b) => (match.scores[b.id] ?? 0) - (match.scores[a.id] ?? 0)
  );

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-3 max-w-lg mx-auto px-2 overflow-y-auto pb-4">
      {/* Outcome banner */}
      <div className={`w-full rounded-2xl p-4 text-center ${
        humanHit ? "bg-green-900/60 border border-green-700" : "bg-red-900/40 border border-red-800"
      }`}>
        <p className="text-xl font-bold mb-0.5">
          {humanHit ? "Bid made! 🎉" : "Bid missed"}
        </p>
        <p className="text-sm text-gray-300">
          You bid <span className="font-bold text-white">{round.bids[0] ?? 0}</span> and won{" "}
          <span className="font-bold text-white">{round.tricksWon[0]}</span> trick
          {round.tricksWon[0] !== 1 ? "s" : ""}
          {" · "}<span className="font-bold text-white">+{lastResult.roundScores[0]}</span> pts
        </p>
        <p className={`text-xs mt-1 font-semibold ${SUIT_COLORS[round.trump]}`}>
          Trump: {SUIT_SYMBOLS[round.trump]} {round.trump.charAt(0).toUpperCase() + round.trump.slice(1)}
        </p>
      </div>

      {/* This round */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            Round {match.roundNumber} results
          </p>
          <p className="text-xs text-gray-500">
            {round.cardsPerPlayer} card{round.cardsPerPlayer !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="grid grid-cols-5 text-xs text-gray-500 px-4 py-1.5">
          <span className="col-span-2">Player</span>
          <span className="text-center">Bid</span>
          <span className="text-center">Won</span>
          <span className="text-center">Pts</span>
        </div>
        <div className="divide-y divide-gray-700">
          {players.map((player) => {
            const bid = round.bids[player.id] ?? 0;
            const won = round.tricksWon[player.id] ?? 0;
            const pts = lastResult.roundScores[player.id] ?? 0;
            const hit = won === bid;
            return (
              <div key={player.id} className={`grid grid-cols-5 items-center px-4 py-2.5 ${
                player.isHuman ? "bg-gray-700/30" : ""
              }`}>
                <div className="col-span-2 flex items-center gap-2">
                  <span className={`text-sm ${hit ? "text-green-400" : "text-red-400"}`}>
                    {hit ? "✓" : "✗"}
                  </span>
                  <span className={`text-sm font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}>
                    {player.name}
                  </span>
                </div>
                <span className="text-center text-gray-300">{bid}</span>
                <span className={`text-center font-semibold ${
                  hit ? "text-green-400" : won > bid ? "text-orange-400" : "text-red-400"
                }`}>{won}</span>
                <span className={`text-center font-bold ${pts > 0 ? "text-green-400" : "text-gray-500"}`}>
                  +{pts}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cumulative leaderboard */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Leaderboard</p>
          <p className="text-xs text-gray-500">after {match.roundNumber} of {numRounds} rounds</p>
        </div>
        <div className="divide-y divide-gray-700">
          {leaderboard.map((player, rank) => (
            <div key={player.id} className={`flex items-center px-4 py-3 ${
              player.isHuman ? "bg-gray-700/30" : ""
            }`}>
              <span className={`w-5 text-sm font-bold mr-3 ${
                rank === 0 ? "text-yellow-400" : "text-gray-500"
              }`}>
                {rank + 1}
              </span>
              <span className={`flex-1 font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}>
                {player.name}
              </span>
              <span className="text-white font-bold text-lg">{match.scores[player.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {canAdvance ? (
        <button
          onClick={onNextRound}
          className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-base transition-colors shadow-lg"
        >
          {isMatchDone ? "See Final Results" : `Start Round ${match.roundNumber + 1} of ${numRounds}`}
        </button>
      ) : (
        <p className="text-center text-sm text-gray-500 py-2 flex items-center justify-center gap-2">
          <span className="animate-pulse">⏳</span> Waiting for host to continue…
        </p>
      )}
    </div>
  );
}
