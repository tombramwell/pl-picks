import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, playerId, playerName, playerTeam, gameweek } = await req.json();
    const userId = session.user.email;

    await dbConnect();

    // 1. Fetch match to verify deadline
    const match = await Match.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // 2. Strict Kickoff Deadline Check
    if (new Date() >= new Date(match.kickoffTime)) {
      return NextResponse.json(
        { error: "Deadline passed. This match has already kicked off!" },
        { status: 400 }
      );
    }

    // 3. Save or update pick
    const pick = await Pick.findOneAndUpdate(
      { userId, matchId },
      { playerId, playerName, playerTeam, gameweek },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, pick });
  } catch (error) {
    console.error("Save Pick Error:", error);
    return NextResponse.json({ error: "Server error saving pick" }, { status: 500 });
  }
}