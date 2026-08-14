import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Pick from '@/models/Pick';
import Match from '@/models/Match';
import Player from '@/models/Player';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const pointMultipliers = {
  "Forward": 1,
  "Midfielder": 2,
  "Defender": 3,
  "Goalkeeper": 10
};

export default async function UserHistory({ params }) {
  await dbConnect();

  // Safely unwrap the URL parameters for Next.js 15
  const resolvedParams = await params;
  const userId = resolvedParams.userId;

  // 1. Fetch the user's profile
  const user = await User.findById(userId).lean();
  if (!user) {
    return (
      <div className="text-center p-8 mt-10">
        <h1 className="text-2xl font-bold">User not found</h1>
        <Link href="/leaderboard" className="text-blue-600 hover:underline mt-4 inline-block">&larr; Back to Table</Link>
      </div>
    );
  }

  // 2. Fetch all of their picks
  const userPicks = await Pick.find({ userId }).lean();

  // 3. Fetch the associated Matches and Players for those picks in bulk
  const matchIds = userPicks.map(p => p.matchId);
  const playerIds = userPicks.map(p => p.playerId);

  const matches = await Match.find({ _id: { $in: matchIds } }).lean();
  const players = await Player.find({ _id: { $in: playerIds } }).lean();

  // 4. Combine the data so it is easy to display in a table
  let totalPoints = 0;
  let rawGoals = 0;

  const historyData = userPicks.map(pick => {
    const match = matches.find(m => m._id.toString() === pick.matchId.toString());
    const player = players.find(p => p._id.toString() === pick.playerId.toString());
    
    // Math logic
    const goals = pick.goalsScored || 0;
    const position = player?.position || "Forward";
    const multiplier = pointMultipliers[position] || 1;
    const points = goals * multiplier;

    // Add to running totals
    totalPoints += points;
    rawGoals += goals;

    return {
      id: pick._id.toString(),
      matchString: match ? `${match.teamA} vs ${match.teamB}` : 'Unknown Match',
      kickoffTime: match ? match.kickoffTime : 0,
      playerName: player?.name || 'Unknown Player',
      position: position,
      multiplier: multiplier,
      goals: goals,
      points: points,
      isFinished: match?.isFinished || false
    };
  });

  // Sort history chronologically so their newest picks show at the top
  historyData.sort((a, b) => new Date(b.kickoffTime) - new Date(a.kickoffTime));

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8">
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
            {user.displayName}'s Selection History
          </h1>
          <p className="text-gray-600 mt-2 font-medium">
            Total Points: <span className="text-blue-600 font-bold">{totalPoints}</span> | Goals: <span className="text-blue-600 font-bold">{rawGoals}</span>
          </p>
        </div>
        <Link href="/leaderboard" className="text-blue-600 hover:underline font-medium">
          &larr; Back to Table
        </Link>
      </header>

      <section className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 uppercase text-xs md:text-sm">
              <th className="p-3 md:p-4 font-bold">Match</th>
              <th className="p-3 md:p-4 font-bold">Player Picked</th>
              <th className="p-3 md:p-4 font-bold text-center">Status</th>
              <th className="p-3 md:p-4 font-bold text-right text-blue-700">Points Earned</th>
            </tr>
          </thead>
          <tbody>
            {historyData.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-500 italic">
                  This user hasn't made any picks yet.
                </td>
              </tr>
            ) : (
              historyData.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 md:p-4 font-medium text-gray-800">
                    {row.matchString}
                  </td>
                  <td className="p-3 md:p-4">
                    <div className="font-bold text-gray-900">{row.playerName}</div>
                    <div className="text-xs text-gray-500">{row.position} ({row.multiplier}x multiplier)</div>
                  </td>
                  <td className="p-3 md:p-4 text-center">
                    {row.isFinished ? (
                      <span className="px-2 py-1 text-xs font-bold bg-green-100 text-green-800 rounded-full">Finished</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-bold bg-yellow-100 text-yellow-800 rounded-full">Pending</span>
                    )}
                  </td>
                  <td className="p-3 md:p-4 text-right font-extrabold text-blue-600 text-xl">
                    {row.isFinished ? row.points : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}