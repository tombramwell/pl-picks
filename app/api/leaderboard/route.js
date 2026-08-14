import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';

export async function GET() {
  try {
    await dbConnect();

    // Aggregate total goals per user
    const leaderboardData = await Pick.aggregate([
      {
        $group: {
          _id: "$userId",
          totalGoals: { $sum: "$goalsScored" },
          totalPicksMade: { $sum: 1 }
        }
      },
      { $sort: { totalGoals: -1, totalPicksMade: 1 } }
    ]);

    // Format response
    const standings = leaderboardData.map((user, index) => ({
      rank: index + 1,
      email: user._id,
      displayName: user._id.split('@')[0], // Friendly display name from email
      totalGoals: user.totalGoals,
      totalPicksMade: user.totalPicksMade
    }));

    return NextResponse.json({ standings });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}