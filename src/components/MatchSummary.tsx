import type { MatchState } from "@/game/types";
import { totalRounds } from "@/game/match";

interface MatchSummaryProps {
  match: MatchState;
  onPlayAgain: () => void;
}

export default function MatchSummary({ match, onPlayAgain }: MatchSummaryProps) {
  const { scores, roundHistory, currentRound } = match;
  const players = currentRound!.players;

  const sorted = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const winner = sorted[0];
  const humanWon = winner.isHuman;
  const humanScore = scores[0] ?? 0;
  const numRounds = totalRounds(match.playerCount);
  // Max possible score: sum of (10 + roundCards) for all rounds
  const maxPossible = Array.from({ length: numRounds }, (_, i) => 10 + (i + 1)).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="flex-1 w-full flex flex-col items-center gap-4 max-w-lg mx-auto px-2 overflow-y-auto pb-6">
      {/* Winner banner */}
      <div className={`w-full rounded-2xl p-5 text-center ${
        humanWon
          ? "bg-yellow-900/50 border border-yellow-600"
          : "bg-gray-800 border border-gray-600"
      }`}>
        <p className="text-3xl font-bold mb-1">
          {humanWon ? "You won! 🏆" : `${winner.name} wins`}
        </p>
        <p className="text-gray-300 text-sm">
          {humanWon
            ? `Your final score: ${humanScore} pts`
            : `${winner.name} scored ${scores[winner.id]} pts — you scored ${humanScore} pts`}
        </p>
      </div>

      {/* Final standings */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Final Standings</p>
        </div>
        <div className="divide-y divide-gray-700">
          {sorted.map((player, rank) => {
            const score = scores[player.id] ?? 0;
            const pct = Math.round((score / maxPossible) * 100);
            return (
              <div key={player.id} className={`px-4 py-3 ${player.isHuman ? "bg-gray-700/30" : ""}`}>
                <div className="flex items-center mb-1.5">
                  <span className={`w-6 text-sm font-bold mr-2 ${
                    rank === 0 ? "text-yellow-400" : "text-gray-500"
                  }`}>
                    {rank + 1}
                  </span>
                  <span className={`flex-1 font-semibold ${player.isHuman ? "text-yellow-300" : "text-gray-200"}`}>
                    {player.name}
                  </span>
                  <span className="text-white font-bold text-lg">{score}</span>
                  <span className="text-gray-500 text-xs ml-1">pts</span>
                </div>
                {/* Score bar */}
                <div className="ml-8 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      rank === 0 ? "bg-yellow-400" : "bg-gray-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Round history */}
      <div className="w-full bg-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-700">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Round History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Rnd</th>
                {players.map((p) => (
                  <th key={p.id} className={`px-2 py-2 text-center font-medium ${
                    p.isHuman ? "text-yellow-400" : "text-gray-400"
                  }`}>
                    {p.isHuman ? "You" : p.name.replace("Player ", "P")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {roundHistory.map((rh) => (
                <tr key={rh.roundNumber} className="hover:bg-gray-700/20">
                  <td className="px-3 py-2 text-gray-500">{rh.roundNumber}</td>
                  {players.map((p) => {
                    const pts = rh.roundScores[p.id] ?? 0;
                    const hit = rh.tricksWon[p.id] === rh.bids[p.id];
                    return (
                      <td key={p.id} className={`px-2 py-2 text-center font-semibold ${
                        pts > 0 ? "text-green-400" : "text-gray-600"
                      }`}>
                        {pts > 0 ? `+${pts}` : hit ? "+10" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-600">
                <td className="px-3 py-2 text-gray-400 font-semibold">Total</td>
                {players.map((p) => (
                  <td key={p.id} className={`px-2 py-2 text-center font-bold ${
                    p.isHuman ? "text-yellow-300" : "text-white"
                  }`}>
                    {scores[p.id] ?? 0}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <button
        onClick={onPlayAgain}
        className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-gray-900 font-bold rounded-full text-base transition-colors shadow-lg"
      >
        Play Again
      </button>
    </div>
  );
}
