import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Match from '@/models/Match';
import Link from 'next/link';

export default async function UserBreakdownPage(props) {
  // Get the current logged-in user
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  // In Next.js App Router, params must be awaited
  const params = await props.params;
  const decodedEmail = decodeURIComponent(params.userEmail);
  const displayName = decodedEmail.split('@')[0];

  // Check if the user is looking at their own profile
  const isOwnProfile = currentUserEmail === decodedEmail;

  await dbConnect();
  const now = new Date();

  // 1. Fetch all picks made by this user
  const picks = await Pick.find({ userId: decodedEmail }).lean();

  // 2. Fetch the corresponding match details for context
  const matchIds = picks.map(p => p.matchId);
  const matches = await Match.find({ _id: { $in: matchIds } }).lean();

  // 3. Combine the data, check lock status, and sort by Gameweek
  const breakdown = picks.map(pick => {
    const match = matches.find(m => m._id.toString() === pick.matchId.toString());
    const isLocked = match ? new Date(match.kickoffTime) <= now : false;

    return {
      ...pick,
      matchTeamA: match?.teamA || 'Unknown',
      matchTeamB: match?.teamB || 'Unknown',
      isFinished: match?.isFinished || false,
      isLocked
    };
  }).sort((a, b) => a.gameweek - b.gameweek);

  const totalPoints = breakdown.reduce((sum, p) => sum + (p.points || 0), 0);
  const totalGoals = breakdown.reduce((sum, p) => sum + (p.goalsScored || 0), 0);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Broadcast Style Header */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-6 flex justify-between items-end shadow-md">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic truncate max-w-[200px] sm:max-w-md">
            {displayName}'s <span className="text-barclays-cyan">Picks</span>
          </h1>
          <span className="text-xs text-gray-300 font-bold tracking-widest uppercase mt-1 block">
            Season Breakdown
          </span>
        </div>
        <Link href="/leaderboard" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition shrink-0">
          ◀ BACK
        </Link>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border-2 border-gray-300 p-4 text-center shadow-sm">
          <span className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Goals</span>
          <span className="text-3xl font-black text-barclays-dark">{totalGoals}</span>
        </div>
        <div className="bg-white border-2 border-barclays-blue p-4 text-center shadow-sm border-b-4">
          <span className="block text-[10px] sm:text-xs font-black text-barclays-blue uppercase tracking-widest mb-1">Total Points</span>
          <span className="text-3xl font-black text-barclays-dark">{totalPoints}</span>
        </div>
      </div>

      {/* Picks List */}
      <div className="space-y-4">
        {breakdown.length === 0 ? (
          <div className="bg-white border-2 border-gray-300 p-8 text-center font-bold text-gray-500 uppercase tracking-widest">
            NO PICKS RECORDED YET
          </div>
        ) : (
          breakdown.map(pick => {
            // Determine if we should reveal this pick
            const showPick = isOwnProfile || pick.isLocked;

            return (
              <div key={pick._id.toString()} className="bg-white border-2 border-gray-300 shadow-sm relative group hover:border-barclays-cyan transition">
                {/* Cyan Accent Top Bar */}
                <div className="h-1 w-full bg-gray-300 group-hover:bg-barclays-cyan transition-colors"></div>

                <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  
                  {/* Match Info */}
                  <div className="flex-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Gameweek {pick.gameweek}
                    </span>
                    <div className="font-black text-barclays-dark uppercase text-sm">
                      {pick.matchTeamA} <span className="text-barclays-cyan mx-1">v</span> {pick.matchTeamB}
                    </div>
                  </div>

                  {/* Player Selected (Hidden Logic Applied Here) */}
                  <div className="flex-1 md:text-center border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Selected Scorer
                    </span>
                    {showPick ? (
                      <>
                        <div className="font-black text-barclays-blue uppercase tracking-wide text-sm sm:text-base">
                          {pick.playerName}
                        </div>
                        <div className="text-xs font-bold text-gray-500 uppercase">
                          {pick.playerTeam}
                        </div>
                      </>
                    ) : (
                      <div className="py-1">
                        <span className="bg-gray-200 text-gray-600 font-black uppercase tracking-widest text-xs px-3 py-1 inline-flex items-center gap-1 shadow-sm border border-gray-300">
                          🔒 HIDDEN
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Goal Outcome Status */}
                  <div className="shrink-0 flex items-center md:justify-end border-t md:border-t-0 border-gray-200 pt-3 md:pt-0 min-w-[140px]">
                    {!pick.isFinished ? (
                      <span className="bg-gray-200 text-gray-500 text-xs font-black uppercase tracking-widest px-4 py-2 w-full text-center">
                        PENDING
                      </span>
                    ) : pick.goalsScored > 0 ? (
                      <span className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-2 border-b-2 border-barclays-cyan w-full text-center shadow-sm">
                        {pick.goalsScored} GLS / {pick.points} PTS
                      </span>
                    ) : (
                      <span className="bg-red-600 text-white text-xs font-black uppercase tracking-widest px-4 py-2 w-full text-center">
                        BLANK <span className="hidden sm:inline">(0 PTS)</span>
                      </span>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}