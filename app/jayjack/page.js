import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Link from 'next/link';

export const revalidate = 0;

export default async function HeadToHeadPage(props) {
  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email;

  await dbConnect();

  // Define the two specific users you want to compare
  // You could also pull these from searchParams if you want it to be dynamic!
  const user1 = "jay.bramwell@gmail.com"; 
  const user2 = "jackswhalley@gmail.com";
  const targetUsers = [user1, user2];

  // Aggregate stats ONLY for the targeted users
  const leaderboardData = await Pick.aggregate([
    { 
      // 1. Filter picks to only include our two specific users
      $match: { userId: { $in: targetUsers } } 
    },
    {
      // 2. Group and sum their stats
      $group: {
        _id: "$userId",
        totalGoals: { $sum: "$goalsScored" },
        totalPoints: { $sum: "$points" },
        totalPicksMade: { $sum: 1 }
      }
    },
    // 3. Sort by points, then goals
    { $sort: { totalPoints: -1, totalGoals: -1, _id: 1 } }
  ]);

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Broadcast Style Header */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-6 flex justify-between items-end shadow-md">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Head-to-Head <span className="text-barclays-cyan">Jay</span> v <span className="text-barclays-cyan">Jack</span>
          </h1>
        </div>
        <Link href="/leaderboard" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition">
          ◀ FULL STANDINGS
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
              
              <th className="py-3 px-3 md:px-6 text-center bg-gray-300 text-barclays-dark w-16 md:w-24 sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] md:shadow-none">
                Pts
              </th>
            </tr>
          </thead>
          <tbody className="text-xs md:text-sm font-bold uppercase text-gray-800">
            {leaderboardData.map((row, index) => {
              // Rank is simpler now, just index + 1, unless there's an exact tie
              const rank = leaderboardData.findIndex(
                r => r.totalPoints === row.totalPoints && r.totalGoals === row.totalGoals
              ) + 1;
              const isCurrentUser = row._id === currentUserEmail;

              return (
                <tr key={row._id} className={`border-b border-gray-200 transition ${isCurrentUser ? 'bg-barclays-cyan bg-opacity-20' : 'bg-white hover:bg-blue-50'}`}>
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 font-black">
                    <span className={`inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full text-xs md:text-sm ${
                      rank === 1 ? 'bg-yellow-400 text-black shadow-sm' : 
                      rank === 2 ? 'bg-red-400 text-white shadow-sm' : 
                      'text-gray-500 bg-transparent'
                    }`}>
                      {rank === 1 ? '£50' : rank === 2 ? '£0' : rank}
                    </span>
                  </td>                  
                  <td className="py-3 px-3 md:px-6 border-r border-gray-200">
                    <Link href={`/leaderboard/${encodeURIComponent(row._id)}`} className="hover:text-barclays-blue hover:underline flex items-center gap-2">
                      <span className="truncate max-w-[120px] sm:max-w-none inline-block align-middle">
                        {row._id.split('@')[0]}
                      </span>
                      {isCurrentUser && <span className="text-[9px] md:text-[10px] bg-barclays-blue text-white px-1.5 py-0.5 tracking-wider shrink-0">YOU</span>}
                    </Link>
                  </td>
                  
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 text-gray-500">{row.totalPicksMade}</td>
                  <td className="py-3 px-2 md:px-6 text-center border-r border-gray-200 text-gray-500">{row.totalGoals}</td>
                  
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