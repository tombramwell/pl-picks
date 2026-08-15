import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function LeaderboardPage() {
  const session = await getServerSession(authOptions);
  await dbConnect();

  // Aggregate total goals scored per user
const leaderboardData = await Pick.aggregate([
    {
      $group: {
        _id: "$userId",
        totalGoals: { $sum: "$goalsScored" },
        totalPoints: { $sum: "$points" }, // <-- Add points sum
        totalPicksMade: { $sum: 1 }
      }
    },
    { $sort: { totalPoints: -1, totalGoals: -1 } } // <-- Sort by points first
  ]);

  const currentUserEmail = session?.user?.email;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Top Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500">Overall goalscorer standings</p>
        </div>
        <Link 
          href="/" 
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
        >
          ◀ Back to Picks
        </Link>
      </div>

      {/* Standings Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-500 tracking-wider">
              <th className="py-4 px-6">Rank</th>
              <th className="py-4 px-6">Player</th>
              <th className="py-4 px-6 text-center">Picks</th>
              <th className="py-4 px-6 text-center">Goals</th>
              <th className="py-4 px-6 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {leaderboardData.map((row, index) => {
              const rank = index + 1;
              const isCurrentUser = row._id === currentUserEmail;

              return (
                <tr 
                  key={row._id} 
                  className={`hover:bg-gray-50 transition ${isCurrentUser ? 'bg-indigo-50 font-bold' : ''}`}
                >
                  {/* Rank Badge */}
                  <td className="py-4 px-6">
                    {rank === 1 && <span className="text-xl">🥇</span>}
                    {rank === 2 && <span className="text-xl">🥈</span>}
                    {rank === 3 && <span className="text-xl">🥉</span>}
                    {rank > 3 && <span className="text-gray-500 font-mono">{rank}.</span>}
                  </td>

                  {/* User Identifier */}
<td className="py-4 px-6 text-gray-900 font-medium">
                    <Link 
                      href={`/leaderboard/${encodeURIComponent(row._id)}`}
                      className="hover:text-indigo-600 hover:underline flex items-center gap-2 transition"
                    >
                      {row._id.split('@')[0]}
                      {isCurrentUser && (
                        <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-normal">
                          You
                        </span>
                      )}
                    </Link>
                  </td>

                  {/* Picks Made Count */}
                  <td className="py-4 px-6 text-center text-gray-500 font-mono">
                    {row.totalPicksMade}
                  </td>

                  {/* Total Goals */}
                  <td className="py-4 px-6 text-center text-gray-500 font-mono">                      {row.totalGoals} 
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-base font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                      {row.totalPoints || 0} pts
                    </span>
                  </td>
                </tr>
              );
            })}

            {leaderboardData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  No picks recorded yet. Be the first to make a pick!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}