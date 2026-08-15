import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Match from '@/models/Match';
import Link from 'next/link';

export default async function UserBreakdownPage(props) {
  // In Next.js App Router, params must be awaited
  const params = await props.params;
  const decodedEmail = decodeURIComponent(params.userEmail);
  const displayName = decodedEmail.split('@')[0];

  await dbConnect();

  // 1. Fetch all picks made by this user
  const picks = await Pick.find({ userId: decodedEmail }).lean();

  // 2. Fetch the corresponding match details for context
  const matchIds = picks.map(p => p.matchId);
  const matches = await Match.find({ _id: { $in: matchIds } }).lean();

  // 3. Combine the data and sort by Gameweek
  const breakdown = picks.map(pick => {
    const match = matches.find(m => m._id.toString() === pick.matchId.toString());
    return {
      ...pick,
      matchTeamA: match?.teamA || 'Unknown',
      matchTeamB: match?.teamB || 'Unknown',
      isFinished: match?.isFinished || false
    };
  }).sort((a, b) => a.gameweek - b.gameweek);

  const totalGoals = breakdown.reduce((sum, p) => sum + (p.goalsScored || 0), 0);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link href="/leaderboard" className="text-sm text-indigo-600 hover:underline mb-2 inline-block">
            ◀ Back to Leaderboard
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900">{displayName}'s Picks</h1>
          <p className="text-sm text-gray-500">Season breakdown</p>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl text-center shadow-sm">
          <span className="block text-xs font-bold text-indigo-400 uppercase tracking-wider">Total Goals</span>
          <span className="text-2xl font-extrabold text-indigo-700">{totalGoals} ⚽</span>
        </div>
      </div>

      {/* Picks List */}
      <div className="space-y-4">
        {breakdown.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            This user hasn't made any picks yet!
          </div>
        ) : (
          breakdown.map(pick => (
            <div key={pick._id.toString()} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4 hover:border-indigo-200 transition">
              
              {/* Match Info */}
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Gameweek {pick.gameweek}
                </span>
                <div className="font-semibold text-gray-800">
                  {pick.matchTeamA} vs {pick.matchTeamB}
                </div>
              </div>

              {/* Player Selected */}
              <div className="md:text-right">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Selected Player
                </span>
                <div className="font-bold text-indigo-900">
                  {pick.playerName} <span className="text-gray-400 font-normal text-sm">({pick.playerTeam})</span>
                </div>
              </div>

              {/* Goal Outcome */}
              <div className="shrink-0">
                {!pick.isFinished ? (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
                    Pending
                  </span>
                ) : pick.goalsScored > 0 ? (
                  <span className="bg-green-100 text-green-700 text-sm font-extrabold px-4 py-2 rounded-lg shadow-sm whitespace-nowrap flex items-center gap-1">
                    +{pick.goalsScored} ⚽
                  </span>
                ) : (
                  <span className="bg-red-50 text-red-500 text-sm font-bold px-4 py-2 rounded-lg whitespace-nowrap">
                    0 Goals
                  </span>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </main>
  );
}