interface RulesScreenProps {
  onClose: () => void;
}

export default function RulesScreen({ onClose }: RulesScreenProps) {
  return (
    <div className="fixed inset-0 z-20 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-gray-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-y-auto max-h-[90vh]">
        {/* Handle / close */}
        <div className="sticky top-0 bg-gray-900 px-5 pt-4 pb-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-400">How to Play</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 text-sm text-gray-300">
          <section>
            <h3 className="text-white font-semibold mb-1.5">Overview</h3>
            <p>
              Judgement is a trick-taking card game for 4 players. A match lasts{" "}
              <strong className="text-white">13 rounds</strong>. Round N deals{" "}
              <strong className="text-white">N cards</strong> to each player (1 card in Round 1,
              13 cards in Round 13). The player with the most points after 13 rounds wins.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1.5">Trump</h3>
            <p>
              After dealing, a card is flipped to reveal the <strong className="text-white">trump suit</strong>.
              Trump cards beat all non-trump cards, regardless of rank.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1.5">Bidding</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>Each player bids how many tricks they expect to win.</li>
              <li>Bidding order starts left of the dealer; the dealer bids last.</li>
              <li>
                <strong className="text-white">Last-bidder rule:</strong> The dealer cannot bid a
                number that would make total bids equal the number of tricks available. This
                guarantees at least one player&apos;s bid will fail.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1.5">Playing Tricks</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li>The player left of the dealer leads the first trick.</li>
              <li>
                <strong className="text-white">Follow suit:</strong> You must play a card of the
                lead suit if you have one. Otherwise, play any card.
              </li>
              <li>
                <strong className="text-white">Winning a trick:</strong> The highest trump wins.
                If no trump was played, the highest card of the lead suit wins.
              </li>
              <li>The trick winner leads the next trick.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1.5">Scoring</h3>
            <div className="bg-gray-800 rounded-xl p-3 space-y-1">
              <div className="flex justify-between">
                <span>Bid correct</span>
                <span className="text-green-400 font-bold">10 + bid points</span>
              </div>
              <div className="flex justify-between">
                <span>Bid incorrect</span>
                <span className="text-red-400 font-bold">0 points</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Example: Bid 3 and win exactly 3 tricks → 13 points. Bid 3 and win 2 → 0 points.
            </p>
          </section>

          <section>
            <h3 className="text-white font-semibold mb-1.5">Dealer Rotation</h3>
            <p>
              The dealer rotates clockwise after each round. The dealer bids last each round and
              is bound by the last-bidder rule.
            </p>
          </section>
        </div>

        <div className="px-5 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-full transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
