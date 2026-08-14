import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';

export async function GET(req, { params }) {
  try {
    // 1. Authenticate with NextAuth
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.email;
    const { matchId } = params;

    await dbConnect();

    // 2. Fetch match details
    const match = await Match.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // 3. Find all player IDs this user has already selected across the season
    const userPicks = await Pick.find({ userId });
    const usedPlayerIds = userPicks.map(p => p.playerId.toString());

    // 4. Fetch players for both teams in this match
    const teamAPlayers = await Player.find({ team: match.teamA });
    const teamBPlayers = await Player.find({ team: match.teamB });

    return NextResponse.json({
      match,
      teamAPlayers,
      teamBPlayers,
      usedPlayerIds
    });
  } catch (error) {
    console.error('Fetch Available Players Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}