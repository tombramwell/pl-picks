import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player'; // We need this to check positions

const ADMIN_EMAILS = ['tom.bramwell@reachplc.com'];

// Multiplier mapping
const getMultiplier = (position) => {
  if (position === 'GK') return 10;
  if (position === 'DEF') return 3;
  if (position === 'MID') return 2;
  return 1; // FWD
};

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_EMAILS.includes(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, scoreTeamA, scoreTeamB, playerGoals, isFinished } = await req.json();
    await dbConnect();

    // 1. Update Match Score
    const match = await Match.findByIdAndUpdate(
      matchId, 
      { scoreTeamA, scoreTeamB, isFinished },
      { new: true }
    );

    // 2. Reset goals and points for this match first (in case of corrections)
    await Pick.updateMany({ matchId }, { goalsScored: 0, points: 0 });

    // 3. Fetch the players who scored to get their positions
    const scoringPlayerIds = Object.keys(playerGoals).filter(id => playerGoals[id] > 0);
    const scoringPlayers = await Player.find({ _id: { $in: scoringPlayerIds } });
    
    const positionMap = {};
    scoringPlayers.forEach(p => {
      positionMap[p._id.toString()] = p.position;
    });

    // 4. Apply new goals AND points to users' picks
    for (const [playerId, goals] of Object.entries(playerGoals)) {
      if (goals > 0) {
        const position = positionMap[playerId] || 'FWD';
        const pointsEarned = goals * getMultiplier(position);

        await Pick.updateMany(
          { matchId, playerId },
          { $set: { goalsScored: goals, points: pointsEarned } }
        );
      }
    }

    return NextResponse.json({ success: true, match });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}