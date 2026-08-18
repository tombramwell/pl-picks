import Link from 'next/link';

export default function RulesPage() {
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Header */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-8 shadow-md flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            How To <span className="text-barclays-cyan">Play</span>
          </h1>
        </div>
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition">
          ◀ BACK 
        </Link>
      </div>

      {/* Rules Content */}
      <div className="bg-white border-2 border-gray-300 shadow-lg p-6 space-y-8 text-barclays-dark">
        
        <section>
          <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-barclays-cyan pb-2 mb-4">Select a scorer - it's that simple</h2>
          <p className="font-medium text-gray-700 leading-relaxed">
            Choose <strong>one player</strong> to score a goal in every Premier League match. If your selected player scores, you earn points for your team.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-barclays-cyan pb-2 mb-4">Oh okay, there's a slight complication</h2>
          <p className="font-medium text-gray-700 leading-relaxed">
            You do need to choose carefully. <strong>You can only pick a player TWICE per season.</strong> Availability resets after Gameweek 19.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-barclays-cyan pb-2 mb-4">Not all players are equal</h2>
          <p className="font-medium text-gray-700 leading-relaxed mb-4">
            Points are awarded based on the position of the goalscorer you select:
          </p>
          <ul className="space-y-2 font-bold">
            <li className="flex justify-between bg-gray-100 p-3 border-l-4 border-gray-400">
              <span>FORWARD (FWD)</span> <span className="text-barclays-blue">1 POINT</span>
            </li>
            <li className="flex justify-between bg-gray-100 p-3 border-l-4 border-green-500">
              <span>MIDFIELDER (MID)</span> <span className="text-barclays-blue">2 POINTS</span>
            </li>
            <li className="flex justify-between bg-gray-100 p-3 border-l-4 border-barclays-cyan">
              <span>DEFENDER (DEF)</span> <span className="text-barclays-blue">3 POINTS</span>
            </li>
            <li className="flex justify-between bg-gray-100 p-3 border-l-4 border-yellow-400">
              <span>GOALKEEPER (GK)</span> <span className="text-barclays-blue">10 POINTS</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-barclays-cyan pb-2 mb-4">Get your timing right</h2>
          <p className="font-medium text-gray-700 leading-relaxed">
            Picks for a specific match lock at kick off. If you miss the deadline for that match, you can still make picks for the later games in that Gameweek. An email reminder will be sent each Friday lunchtime if you haven't already made your selections for the upcoming Gameweek.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black uppercase tracking-wide border-b-2 border-barclays-cyan pb-2 mb-4">Wanna play for prizes?</h2>
          <p className="font-medium text-gray-700 leading-relaxed">
            Premiership Picks is entirely free to play. However, if you would like to compete for the prize pot, there is the option to do so for £10 - 100% of the pot will be distributed as prizes.
          </p>
          <div className="bg-gray-50 p-6 border-2 border-gray-300">
            <p className="font-black text-barclays-dark uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">How to enter:</p>
            <ol className="list-decimal list-inside space-y-4 font-bold text-gray-700">
              <li>
                Send exactly £10 via <a href="https://revolut.me/thomasvd5r?currency=GBP&amount=1000" target="_blank" className="text-barclays-cyan hover:underline hover:text-barclays-blue transition">Revolut</a> or <a href="https://paypal.me/premiershippicks" target="_blank" className="text-barclays-cyan hover:underline hover:text-barclays-blue transition">PayPal</a>.
              </li>
              <li>
                Choose the 'Friends and family' option and be sure to include your <strong>login email address</strong> in the payment reference note.
              </li>
              <li>
                Your entry will be confirmed and you will be added to the additional 'Prizes' tab on the leaderboard.
              </li>
              <li>
                Entries will be accepted until the end of the first international break - before Gameweek 6. Payments must be received by that point or you'll be playing for fun only.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  );
}