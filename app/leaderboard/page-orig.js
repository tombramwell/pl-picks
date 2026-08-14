import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Pick from '@/models/Pick';
import Link from 'next/link';

// Force Next.js to recalculate the scores fresh every time the page loads
export const dynamic = 'force-dynamic';

export default async function Leaderboard() {
  await dbConnect();

  // 1. Fetch everyone in the family and all picks ever made
  const users = await User.find({}).lean();
  const allPicks = await Pick.find({}).lean();

  // 2. Map through the users and calculate their total points dynamically
  const leaderboardData = users.map(user => {
    // Find only the picks belonging to this specific user
    const userPicks = allPicks.filter(pick => pick.userId.toString() === user._id.toString());
    
    // Sum up the goals scored across all those picks
    const totalPoints = userPicks.reduce((sum, pick) => sum + (pick.goalsScored || 0), 0);
    
    return {
      id: user._id.toString(),
      username: user.username,
      totalPoints: totalPoints,
      picksMade: userPicks.length
    };
  });

  // 3. Sort them from highest points to lowest
  leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8 border-b pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            Standings
          </h1>
          <p className="text-gray-600 mt-2">Who is taking home the trophy?</p>
        </div>
      </header>

      <section className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-700 uppercase text-sm">
              <th className="p-4 font-bold">Rank</th>
              <th className="p-4 font-bold">Player</th>
              <th className="p-4 font-bold text-center">Picks Made</th>
              <th className="p-4 font-bold text-right">Total Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((user, index) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-semibold text-gray-600">
                  {index === 0 ? '🏆 1' : index + 1}
                </td>
                <td className="p-4 font-bold text-gray-900">{user.username}</td>
                <td className="p-4 text-center text-gray-500">{user.picksMade} / 104</td>
                <td className="p-4 text-right font-extrabold text-blue-600 text-xl">
                  {user.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}