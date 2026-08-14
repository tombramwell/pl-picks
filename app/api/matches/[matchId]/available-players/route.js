import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; 
import jwt from 'jsonwebtoken';         
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';

export async function GET(request, { params }) {
  await dbConnect();
  
  // Await params for Next.js 15 compatibility
  const { matchId } = await params;

  try {
    // 1. Extract the secure token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Decode the token to get the real User ID
    let currentUserId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      currentUserId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // 3. Fetch the match to see who is playing
    const match = await Match.findById(matchId);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // 4. Get the entire squad list for both teams (ADDED .lean() so we can edit the objects)
    const allMatchPlayers = await Player.find({
      team: { $in: [match.teamA, match.teamB] }
    }).lean();

    // 5. Find every pick the current user has made so far in the tournament
    const userPreviousPicks = await Pick.find({ userId: currentUserId });
    
    // 6. Extract the player IDs, but EXCLUDE the pick for this specific match! 
    // (This ensures they can still re-select their current choice if they change their mind)
    const usedPlayerIds = userPreviousPicks
      .filter(pick => pick.matchId.toString() !== matchId)
      .map(pick => pick.playerId.toString());

    // 7. NEW LOGIC: Map the players to include the 'isUsed' flag instead of filtering them out
    const availablePlayers = allMatchPlayers.map(player => ({
      ...player,
      _id: player._id.toString(), // Ensure the ID is a clean string for the frontend
      isUsed: usedPlayerIds.includes(player._id.toString())
    }));

    // 8. Sort the players (Home vs Away, then by Squad Number)
    availablePlayers.sort((a, b) => {
      
      // RULE A: Sort by Team (Home Team 'teamA' always comes before Away Team 'teamB')
      if (a.team === match.teamA && b.team === match.teamB) return -1;
      if (a.team === match.teamB && b.team === match.teamA) return 1;

      // RULE B: If they are on the same team, sort by Squad Number
      if (a.team === b.team) {
        // Fallback to 999 for teams where the journalist omitted squad numbers
        const numA = (a.squadNumber !== null && a.squadNumber !== undefined) ? a.squadNumber : 999;
        const numB = (b.squadNumber !== null && b.squadNumber !== undefined) ? b.squadNumber : 999;

        if (numA !== numB) {
          return numA - numB;
        }

        // TIE-BREAKER: If squad numbers are identical (or both are null), sort alphabetically
        return a.name.localeCompare(b.name);
      }

      return 0;
    });

    // 9. Return the properly flagged AND sorted list to the frontend dropdown
    return NextResponse.json({ availablePlayers });

  } catch (error) {
    console.error("Available Players API Error:", error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}