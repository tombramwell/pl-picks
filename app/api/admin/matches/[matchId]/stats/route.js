import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Player from '@/models/Player';

export async function GET(request, { params }) {
  try {
    await dbConnect();

    // Safely resolve params (Supports both Next.js 14 and 15)
    const resolvedParams = await params;
    const matchId = resolvedParams.matchId;

    // 1. Fetch all picks for this match
    const picks = await Pick.find({ matchId });

    // 2. Tally up the raw player IDs
    const playerCounts = {};
    const playerIdsToFetch = new Set();

    picks.forEach(pick => {
      if (!pick.playerId) return; 
      
      const pId = pick.playerId.toString();
      
      if (!playerCounts[pId]) {
        playerCounts[pId] = 0;
        playerIdsToFetch.add(pId);
      }
      playerCounts[pId] += 1;
    });

    // 3. Fetch the actual player details safely
    const players = await Player.find({ _id: { $in: Array.from(playerIdsToFetch) } });

    // 4. Combine the player details with their vote counts
    const sortedStats = players.map(player => ({
      id: player._id.toString(),
      name: player.name,
      team: player.team,
      count: playerCounts[player._id.toString()] || 0
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json({ totalPicks: picks.length, stats: sortedStats }, { status: 200 });

  } catch (error) {
    console.error("Stats API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch stats', details: error.message }, { status: 500 });
  }
}