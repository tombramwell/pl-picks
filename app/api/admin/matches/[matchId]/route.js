export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';
import mongoose from 'mongoose';

export async function GET(request, { params }) {
  await dbConnect();
  const { matchId } = await params;

  try {
    // 1. Find all picks for this match
    const picksForMatch = await Pick.find({ matchId });
    
    // Extract unique player IDs (safely converting to strings)
    const uniquePlayerIds = [...new Set(picksForMatch.map(p => p.playerId.toString()))];

    // 2. Find the players in the database (using .lean() so we can edit the objects)
    const players = await Player.find({ _id: { $in: uniquePlayerIds } }).lean();

    // 3. THE UPGRADE: Map the saved goals onto the player objects!
    const playersWithGoals = players.map(player => {
      // Find a pick that belongs to this specific player
      const matchingPick = picksForMatch.find(p => p.playerId.toString() === player._id.toString());
      
      return {
        ...player,
        _id: player._id.toString(), // Ensure clean string ID for the frontend
        // If we found a pick, attach its goals. Otherwise, default to 0.
        savedGoals: matchingPick ? matchingPick.goalsScored : 0
      };
    });

    return NextResponse.json({ players: playersWithGoals });
  } catch (error) {
    console.error("Admin GET Error:", error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  await dbConnect();
  const { matchId } = await params;

  try {
    const body = await request.json(); 
    const { playerGoals } = body;

    console.log("\n--- ADMIN SAVE TRIGGERED (THE FAILSAFE WAY) ---");

    let totalModified = 0;

    // 1. Fetch all picks for this match FIRST (We know this works flawlessly!)
    const picksForMatch = await Pick.find({ matchId });
    
    console.log(`Found ${picksForMatch.length} picks in the database to process.`);

    // 2. Loop through the actual database documents and update them in memory
    if (playerGoals && picksForMatch.length > 0) {
      for (const pick of picksForMatch) {
        
        // Convert the database ID to a safe string to check against our payload
        const pidStr = pick.playerId.toString();
        
        // Check if the admin typed a goal value for this specific player
        if (playerGoals[pidStr] !== undefined) {
          const safeGoals = parseInt(playerGoals[pidStr], 10) || 0;
          
          // Update the document directly
          pick.goalsScored = safeGoals;
          
          // .save() natively handles all schema rules, ignoring type-mismatches!
          await pick.save(); 
          
          totalModified++;
        }
      }
    }

    // 3. Mark the match as finished
    await Match.findByIdAndUpdate(matchId, { isFinished: true });

    console.log(`--- SAVE COMPLETE. Total User Picks Updated: ${totalModified} ---\n`);

    return NextResponse.json({ 
      success: true, 
      message: `Scores saved! Successfully updated ${totalModified} user picks.` 
    });
  } catch (error) {
    console.error("Admin POST Error:", error);
    return NextResponse.json({ error: 'Failed to save scores' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  await dbConnect();
  
  const resolvedParams = await params;
  const matchId = resolvedParams.matchId || resolvedParams.id;

  try {
    const { teamA, teamB } = await request.json(); 

    // Update the match with the real teams
    await Match.findByIdAndUpdate(matchId, { 
      $set: { teamA: teamA, teamB: teamB } 
    });

    return NextResponse.json({ success: true, message: 'Teams updated successfully!' });
  } catch (error) {
    console.error("Admin PATCH Error:", error);
    return NextResponse.json({ error: 'Failed to update teams' }, { status: 500 });
  }
}