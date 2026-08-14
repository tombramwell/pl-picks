import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';

const API_BASE = 'https://footballapi.pulselive.com/football';
const SEASON_ID = 841; // Using the exact same season ID as the players!

const headers = {
  Origin: 'https://www.premierleague.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

export async function GET() {
  try {
    await dbConnect();

    // comps=1 is the Premier League. pageSize=400 grabs all 380 matches in one single request!
    const url = `${API_BASE}/fixtures?comps=1&compSeasons=${SEASON_ID}&page=0&pageSize=400&sort=asc`;
    
    console.log('Fetching PL matches:', url);

    const response = await fetch(url, { headers, cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`PulseLive API responded with ${response.status}`);
    }

    const data = await response.json();
    const fixtures = data.content || [];
    let addedOrUpdated = 0;

    for (const match of fixtures) {
      // The API sometimes includes TBD/postponed games without a gameweek object yet.
      if (!match.gameweek || !match.gameweek.gameweek) continue;

      const gameweek = match.gameweek.gameweek;
      const plMatchId = String(match.id);
      
      // Navigate the JSON to get the home and away team names
      const teamA = match.teams[0].team.name || match.teams[0].team.shortName;
      const teamB = match.teams[1].team.name || match.teams[1].team.shortName;
      
      // Some matches only have a provisional kickoff time if the TV schedule isn't set
      const kickoffTime = match.kickoff 
        ? new Date(match.kickoff.millis) 
        : new Date(match.provisionalKickoff.millis);
      
      const isFinished = match.status === 'C'; // 'C' = Completed

      // UPSERT: Create the match, or update it if a fixture time changes!
      await Match.findOneAndUpdate(
        { plMatchId: plMatchId },
        {
          plMatchId: plMatchId,
          gameweek: gameweek,
          teamA: teamA,
          teamB: teamB,
          kickoffTime: kickoffTime,
          isFinished: isFinished
        },
        { upsert: true, new: true }
      );

      addedOrUpdated++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${addedOrUpdated} Premier League matches to the database!`,
    });

  } catch (error) {
    console.error("Match Seeder Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to seed matches" }, 
      { status: 500 }
    );
  }
}