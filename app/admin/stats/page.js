import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Match from '@/models/Match';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Always fetch fresh data

export default async function AdminStatsPage() {
  const session = await getServerSession(authOptions);
  
  // Basic security check (adjust if you have specific admin emails!)
  if (!session) {
    redirect('/api/auth/signin');
  }

  await dbConnect();
  const now = new Date();

  // 1. Determine the Active Gameweek
  const latestMatch = await Match.findOne({ kickoffTime: { $lte: now } }).sort({ kickoffTime: -1 }).lean() 
                   || await Match.findOne().sort({ kickoffTime: 1 }).lean();
  
  const activeGameweek = latestMatch ? latestMatch.gameweek : 1;

  // 2. Fetch all matches for this gameweek to check lock status
  const gwMatches = await Match.find({ gameweek: activeGameweek }).lean();
  const matchDictionary = {};
  gwMatches.forEach(m => {
    matchDictionary[m._id.toString()] = {
      isLocked: new Date(m.kickoffTime) <= now,
      kickoffTime: new Date(m.kickoffTime)
    };
  });

  // 3. The Magic: MongoDB Aggregation to count picks
  const popularPicks = await Pick.aggregate([
    { $match: { gameweek: activeGameweek } },
    { 
      $group: { 
        _id: "$playerId", 
        count: { $sum: 1 }, 
        playerName: { $first: "$playerName" }, 
        playerTeam: { $first: "$playerTeam" },
        matchId: { $first: "$matchId" }
      } 
    },
    { $sort: { count: -1 } } // Sort by most picked
  ]);

  // 4. Combine the aggregated picks with the match lock status
  const stats = popularPicks.map(stat => {
    const matchData = matchDictionary[stat.matchId.toString()];
    return {
      ...stat,
      isLocked: matchData?.isLocked || false,
      kickoffTime: matchData?.kickoffTime
    };
  });

  const totalPicks = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-800 to-black text-white p-6 border-b-4 border-barclays-cyan mb-8 shadow-md flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic truncate mb-1">
            Admin <span className="text-barclays-cyan">Insights</span>
          </h1>
          <span className="text-xs text-gray-300 font-bold tracking-widest uppercase block">
            Gameweek {activeGameweek} Pick Distribution
          </span>
        </div>
        <div className="flex gap-2">
          <Link href="/admin" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition bg-white/10 px-4 py-2 border border-white/20">
            ◀ DASHBOARD
          </Link>
        </div>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border-2 border-gray-300 p-4 text-center shadow-sm">
          <span className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Picks Submitted</span>
          <span className="text-3xl font-black text-barclays-dark">{totalPicks}</span>
        </div>
        <div className="bg-white border-2 border-gray-300 p-4 text-center shadow-sm">
          <span className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Unique Players Chosen</span>
          <span className="text-3xl font-black text-barclays-dark">{stats.length}</span>
        </div>
      </div>

      <h3 className="text-lg font-black uppercase tracking-widest text-barclays-dark mb-4 border-b-2 border-gray-200 pb-2">
        Most Picked Players
      </h3>

      {/* The Stats Table */}
      <div className="bg-white border-2 border-gray-300 shadow-sm relative">
        <div className="grid grid-cols-12 gap-4 p-4 border-b-2 border-gray-200 bg-gray-50 text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400">
          <div className="col-span-6 sm:col-span-5">Player</div>
          <div className="col-span-3 sm:col-span-4">Status</div>
          <div className="col-span-3 sm:col-span-3 text-right">Picked By</div>
        </div>

        <div className="divide-y-2 divide-gray-100">
          {stats.map((player, index) => {
            // Calculate percentage of total picks
            const percentage = ((player.count / totalPicks) * 100).toFixed(1);
            
            return (
              <div key={player._id} className="grid grid-cols-12 gap-4 p-4 items-center transition hover:bg-gray-50">
                
                {/* Player Name & Team */}
                <div className="col-span-6 sm:col-span-5">
                  <span className="block font-black uppercase tracking-wide truncate text-barclays-dark text-base">
                    {index + 1}. {player.playerName}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {player.playerTeam}
                  </span>
                </div>

                {/* Lock Status (Safe to share?) */}
                <div className="col-span-3 sm:col-span-4">
                  {player.isLocked ? (
                    <span className="inline-block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white bg-green-600 px-2 py-1 shadow-sm">
                      🔒 LOCKED (Safe to share)
                    </span>
                  ) : (
                    <span className="inline-block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-600 bg-yellow-300 px-2 py-1 shadow-sm">
                      ⏳ PRE-MATCH (Secret)
                    </span>
                  )}
                </div>

                {/* Pick Count */}
                <div className="col-span-3 sm:col-span-3 text-right">
                  <span className="font-black text-xl text-barclays-blue block">
                    {player.count} <span className="text-sm text-gray-400">({percentage}%)</span>
                  </span>
                </div>
                
              </div>
            );
          })}
          
          {stats.length === 0 && (
             <div className="p-8 text-center text-gray-400 font-bold uppercase tracking-widest">
               No picks have been made for this gameweek yet.
             </div>
          )}
        </div>
      </div>
      
    </main>
  );
}