import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE = 'https://footballapi.pulselive.com/football';
const SEASON_ID = process.env.SEASON_ID || 841; 

const headers = {
  Origin: 'https://www.premierleague.com',
  Referer: 'https://www.premierleague.com/',
  account: 'premierleague',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Accept: 'application/json',
};

async function pulseLiveFetch(url) {
  const response = await fetch(url, { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`PulseLive Error: ${response.status}`);
  return response.json();
}

const normalizeTeamName = (teamName) => {
  if (!teamName) return '';
  return teamName.toLowerCase().replace(' & ', ' and ').trim();
};

export async function GET(request) {
  // Security Check (Same dual-auth as our other crons)
  const authHeader = request.headers.get('authorization');
  const session = await getServerSession(authOptions);
  const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidAdmin = session && session.user;

  if (!isValidCron && !isValidAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();
    
    // We want matches kicking off in the next 90 minutes, or that started in the last 15 minutes
    const ninetyMinsFromNow = new Date(now.getTime() + (90 * 60 * 1000));
    const fifteenMinsAgo = new Date(now.getTime() - (15 * 60 * 1000));

    const upcomingMatches = await Match.find({
      kickoffTime: { $gte: fifteenMinsAgo, $lte: ninetyMinsFromNow }
    });

    if (upcomingMatches.length === 0) {
      return NextResponse.json({ message: 'No matches in the 90-minute pre-match window.' });
    }

    // Fetch master fixtures list to match IDs
    const allFixturesRes = await pulseLiveFetch(`${API_BASE}/fixtures?comps=1&compSeasons=${SEASON_ID}&page=0&pageSize=400`);
    const pulseLiveFixtures = allFixturesRes.content || [];

    let updatedCount = 0;

    for (const dbMatch of upcomingMatches) {
      const plFixture = pulseLiveFixtures.find(f => {
        const plTeam1 = normalizeTeamName(f.teams[0].team.name);
        const plTeam2 = normalizeTeamName(f.teams[1].team.name);
        const dbTeamA = normalizeTeamName(dbMatch.teamA);
        const dbTeamB = normalizeTeamName(dbMatch.teamB);
        return (plTeam1 === dbTeamA && plTeam2 === dbTeamB) || (plTeam1 === dbTeamB && plTeam2 === dbTeamA);
      });

      if (!plFixture) continue;

      // Fetch specific match details
      const matchDetail = await pulseLiveFetch(`${API_BASE}/fixtures/${plFixture.id}`);
      
      // Check if teamLists (lineups) exist yet
      if (matchDetail.teamLists && matchDetail.teamLists.length === 2) {
        
        const extractLineupIds = async (teamList) => {
          if (!teamList || !teamList.lineup) return [];
          const pulseIds = teamList.lineup.map(player => String(player.id));
          // Look up these players in our DB to get their MongoDB _ids
          const dbPlayers = await Player.find({ plId: { $in: pulseIds } }).lean();
          return dbPlayers.map(p => p._id.toString());
        };

        let teamALineup = [];
        let teamBLineup = [];

// Safely determine which array belongs to which team using the main 'teams' object
        if (!matchDetail.teams || matchDetail.teams.length < 2) continue;

        if (normalizeTeamName(matchDetail.teams[0].team.name) === normalizeTeamName(dbMatch.teamA)) {
            teamALineup = await extractLineupIds(matchDetail.teamLists[0]);
            teamBLineup = await extractLineupIds(matchDetail.teamLists[1]);
        } else {
            teamALineup = await extractLineupIds(matchDetail.teamLists[1]);
            teamBLineup = await extractLineupIds(matchDetail.teamLists[0]);
        }

        // Only update if we actually found 11 players for at least one team
        if (teamALineup.length > 0 || teamBLineup.length > 0) {
          await Match.findByIdAndUpdate(dbMatch._id, { teamALineup, teamBLineup });
          updatedCount++;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit pause
    }

    return NextResponse.json({ success: true, message: `Successfully updated lineups for ${updatedCount} matches.` });

  } catch (error) {
    console.error('Lineup Scrape Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}