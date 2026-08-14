import Link from 'next/link';

export const metadata = {
  title: 'How to Play | WC Challenge',
};

export default function RulesPage() {
  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            How to Play
          </h1>
          <p className="text-gray-600 mt-2">It's a simple game, here's how to play. Good luck!</p>
        </div>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          &larr; Back to Dashboard
        </Link>
      </header>

      <section className="space-y-8 bg-white p-6 md:p-8 rounded-lg shadow-sm border border-gray-200">
        
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">What is the game?</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Choose <strong>one player</strong> to score a goal in each match of the 2026 World Cup.</li>
            <li>You can submit your pick at any point up until the exact kickoff time. Once the match kicks off, your pick is locked in and cannot be changed - even if that player does not play.</li>
            <li>If you fail to make a pick before kick-off, you score 0 points for that match.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Anything else to watch out for?</h2>
          <ul className="list-disc pl-5 text-gray-600 space-y-2">
            <li>Once you pick a player, <strong>you cannot pick them again for the rest of the tournament</strong>.</li>
            <li>For example, if you pick Harry Kane in England's first group stage match - he's no longer an option for any future fixtures. Manage the superstars wisely.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">How do the points work?</h2>
          <p className="text-gray-600 mb-4">
            Every time a goal is scored by a player you have selected, points are earned based on the position of that player. In theory, the less likely it is for them to score, the more points you get if they do.
            <br />In the knockout stages of the competition, goals in extra-time will be counted, but those scored in penalty shootouts will not.
          </p>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <ul className="space-y-3 font-medium text-blue-900">
              <li className="flex justify-between border-b border-blue-200 pb-2">
                <span>Forward</span>
                <span className="font-bold">1pt per goal</span>
              </li>
              <li className="flex justify-between border-b border-blue-200 pb-2">
                <span>Midfielder</span>
                <span className="font-bold">2pts per goal</span>
              </li>
              <li className="flex justify-between border-b border-blue-200 pb-2">
                <span>Defender</span>
                <span className="font-bold">3pts per goal</span>
              </li>
              <li className="flex justify-between pt-1">
                <span>Goalkeeper</span>
                <span className="font-bold">10pts per goal</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-gray-500 mt-3 italic">
            Example: If you pick a Midfielder and they score 2 goals, you would earn 4 points for that match.
          </p>
        </div>

      </section>
    </main>
  );
}