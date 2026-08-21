import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';

export async function POST(req) {
  try {
    await dbConnect();
    const { matchId, isFinished, scoreTeamA, scoreTeamB, playerGoals } = await req.json();

    // 1. Update the Match scores and status
    await Match.findByIdAndUpdate(matchId, {
      isFinished,
      scoreTeamA,
      scoreTeamB
    });

    // 2. Fetch all user Picks for this specific match
    const picks = await Pick.find({ matchId });

    // 3. Update each pick with the correct positional multipliers!
    for (const pick of picks) {
      const goalsScored = playerGoals[pick.playerId] || 0;
      let points = 0;

      if (goalsScored > 0) {
        // Find the player in the database to check their position
        const player = await Player.findById(pick.playerId);
        
        let multiplier = 1; // Default for Forward (1x)
        if (player) {
          if (player.position === 'Midfielder') multiplier = 2;
          if (player.position === 'Defender') multiplier = 3;
          if (player.position === 'Goalkeeper') multiplier = 10;
        }
        
        points = goalsScored * multiplier;
      }

      // Save the mathematically corrected points to the user's pick
      await Pick.findByIdAndUpdate(pick._id, {
        goalsScored,
        points
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update Match Error:', error);
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 });
  }
}