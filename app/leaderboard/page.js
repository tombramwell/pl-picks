import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Entrant from '@/models/Entrant';
import Link from 'next/link';

export const revalidate = 0;

export default async function LeaderboardPage(props) {
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  await dbConnect();

  // URL Params mapping
  const searchParams = await props.searchParams;
  const isPaidView = searchParams?.view === 'paid';

  // Fetch Paid Users
  const paidEntrants = await Entrant.find({ hasPaid: true }).lean();
  const paidEmails = paidEntrants.map(e => e.email);

  // Aggregate stats
  let leaderboardData = await Pick.aggregate([
    {
      $group: {
        _id: "$userId",
        totalGoals: { $sum: "$goalsScored" },
        totalPoints: { $sum: "$points" },
        totalPicksMade: { $sum: 1 }
      }
    },
    { $sort: { totalPoints: -1, totalGoals: -1, id: 1 } }
  ]);

  // Filter if looking at Prize Pot
  if (isPaidView) {
    leaderboardData = leaderboardData.filter(row => paidEmails.includes(row._id));
  }

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Broadcast Style Header */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-6 flex justify-between items-end shadow-md">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Overall <span className="text-barclays-cyan">Standings</span>
          </h1>
        </div>
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition">
          ◀ BACK TO PICKS
        </Link>
      </div>

      {/* Leaderboard Tabs */}
      <div className="flex gap-2 mb-6">
        <Link 
          href="/leaderboard?view=all"
          className={`flex-1 text-center py-3 font-black uppercase tracking-widest border-2 transition ${
            !isPaidView ? 'bg-barclays-blue text-white border-barclays-cyan shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Players
        </Link>
        <Link 
          href="/leaderboard?view=paid"
          className={`flex-1 text-center py-3 font-black uppercase tracking-widest border-2 transition ${
            isPaidView ? 'bg-yellow-400 text-black border-yellow-600 shadow-md' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
          }`}
        >
          🏆 Prizes
        </Link>
      </div>

      {/* Standings Table */}
      <div className="bg-white border-2 border-gray-300 shadow-lg overflow-x-auto relative">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-200 border-b-2 border-gray-400 text-[10px] md:text-xs uppercase font-black text-gray-700 tracking-wider">
              <th className="py-3 px-2 md:px-6 w-10 md:w-12 text-center border-r border-gray-300">Pos</th>
              <th className="py-3 px-3 md:px-6 border-r border-gray-300">Manager</th>
              <th className="py-3 px-2 md:px-6 text-center border-r border-gray-300">Pld</th>
              <th className="py-3 px-2 md:px-6 text-center border-r border-gray-300">Gls</th>
              
              {/* Sticky Points Header */}
              <th className="py-3 px-3 md:px-6 text-center bg-gray-300 text-barclays-dark w-16 md:w-24 sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] md:shadow-none">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="text-xs md:text-sm font-bold uppercase text-gray-800">
            {leaderboardData.map((row, index) => {
              const rank = leaderboardData.findIndex(
                r => r.totalPoints === row.totalPoints && r.totalGoals === row.totalGoals
              ) + 1;
              const isCurrentUser = row._id === currentUserEmail;

              return (
                <tr key={row._id} className={`border-b border-gray-200 transition ${isCurrentUser ? 'bg-barclays-cyan bg-opacity-20' : 'bg-white hover:bg-blue-50'}`}>
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 font-black">
                    <span className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-xs md:text-sm ${
                      rank === 1 ? 'bg-yellow-400 text-black shadow-sm' : 
                      rank === 2 ? 'bg-gray-300 text-gray-800 shadow-sm' : 
                      rank === 3 ? 'bg-amber-600 text-white shadow-sm' : 
                      'text-gray-500 bg-transparent'
                    }`}>
                      {rank}
                    </span>
                  </td>                  
                  <td className="py-3 px-3 md:px-6 border-r border-gray-200">
                    <Link href={`/leaderboard/${encodeURIComponent(row._id)}`} className="hover:text-barclays-blue hover:underline flex items-center gap-2">
                      {/* Truncate long emails on mobile so they don't force massive scrolling */}
                      <span className="truncate max-w-[120px] sm:max-w-none inline-block align-middle">
                        {row._id.split('@')[0]}
                      </span>
                      {isCurrentUser && <span className="text-[9px] md:text-[10px] bg-barclays-blue text-white px-1.5 py-0.5 tracking-wider shrink-0">YOU</span>}
                    </Link>
                  </td>
                  
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 text-gray-500">{row.totalPicksMade}</td>
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 text-gray-500">{row.totalGoals}</td>
                  
                  {/* Sticky Points Cell */}
                  <td className={`py-3 px-3 md:px-6 text-center font-black text-base md:text-lg text-barclays-blue sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] md:shadow-none ${isCurrentUser ? 'bg-[#cceeff]' : 'bg-gray-100'}`}>
                    {row.totalPoints || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}