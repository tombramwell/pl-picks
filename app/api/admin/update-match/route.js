import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';

const ADMIN_EMAILS = ['tom.bramwell@reachplc.com']; // Hardcoded admin gate

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_EMAILS.includes(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, scoreTeamA, scoreTeamB, playerGoals, isFinished } = await req.json();
    await dbConnect();

    // 1. Update Match Score & Status
    const match = await Match.findByIdAndUpdate(
      matchId, 
      { scoreTeamA, scoreTeamB, isFinished },
      { new: true }
    );

    // 2. Reset goals for this match first (in case of corrections)
    await Pick.updateMany({ matchId }, { goalsScored: 0 });

    // 3. Apply new goals to users' picks
    // playerGoals is an object: { "playerId_1": 2, "playerId_2": 1 }
    for (const [playerId, goals] of Object.entries(playerGoals)) {
      if (goals > 0) {
        await Pick.updateMany(
          { matchId, playerId },
          { $set: { goalsScored: goals } }
        );
      }
    }

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}