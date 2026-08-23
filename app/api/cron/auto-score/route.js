import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// ==========================================
// 1. PULSELIVE SCRAPER CONFIGURATION
// ==========================================
const API_BASE = 'https://footballapi.pulselive.com/football';
const SEASON_ID = process.env.SEASON_ID || 841; 

const headers = {
  Origin: 'https://www.premierleague.com',
  Referer: 'https://www.premierleague.com/',
  account: 'premierleague',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
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
  // 2. Security Check
  const authHeader = request.headers.get('authorization');
  const session = await getServerSession(authOptions);

  const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidAdmin = session && session.user; // You can restrict this to your specific email if you want!

  if (!isValidCron && !isValidAdmin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    await dbConnect();
    const now = new Date();

    // 3. Find matches in our database that have kicked off but aren't finished
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const activeMatches = await Match.find({
      kickoffTime: { $lte: now, $gte: threeDaysAgo },
      isFinished: false
    });

    if (activeMatches.length === 0) {
      return NextResponse.json({ message: 'No live matches to score.' });
    }

    // 4. Fetch the master list of all fixtures from PulseLive
    // We grab the whole season (pageSize=400) in one quick request to find the IDs
    const allFixturesRes = await pulseLiveFetch(`${API_BASE}/fixtures?comps=1&compSeasons=${SEASON_ID}&page=0&pageSize=400`);
    const pulseLiveFixtures = allFixturesRes.content || [];

    let matchesProcessed = 0;

    // 5. Process each live match from our database
    for (const dbMatch of activeMatches) {
      
      // Step A: Find the matching PulseLive fixture ID based on team names
      const plFixture = pulseLiveFixtures.find(f => {
        const plTeam1 = normalizeTeamName(f.teams[0].team.name);
        const plTeam2 = normalizeTeamName(f.teams[1].team.name);
        const dbTeamA = normalizeTeamName(dbMatch.teamA);
        const dbTeamB = normalizeTeamName(dbMatch.teamB);
        
        return (plTeam1 === dbTeamA && plTeam2 === dbTeamB) || (plTeam1 === dbTeamB && plTeam2 === dbTeamA);
      });

      if (!plFixture) {
        console.warn(`Could not find PulseLive match for ${dbMatch.teamA} v ${dbMatch.teamB}`);
        continue; 
      }

      // Step B: Fetch the detailed match events using the specific Fixture ID
      const matchDetail = await pulseLiveFetch(`${API_BASE}/fixtures/${plFixture.id}`);
      
      // 'U' = Unplayed, 'L' = Live, 'C' = Completed
      if (matchDetail.status === 'U') continue; 

      const isFinished = matchDetail.status === 'C';
      
      // Assign the correct scores back to Team A and Team B
      let scoreTeamA = 0;
      let scoreTeamB = 0;
      
      if (normalizeTeamName(matchDetail.teams[0].team.name) === normalizeTeamName(dbMatch.teamA)) {
          scoreTeamA = matchDetail.teams[0].score || 0;
          scoreTeamB = matchDetail.teams[1].score || 0;
      } else {
          scoreTeamA = matchDetail.teams[1].score || 0;
          scoreTeamB = matchDetail.teams[0].score || 0;
      }

// Step C: Extract Goalscorers!
      const playerGoals = {};
      
      // PulseLive holds official 'goals' until full-time. 
      // During live matches, they broadcast them in the 'events' timeline.
      const liveEvents = (matchDetail.goals && matchDetail.goals.length > 0) 
        ? matchDetail.goals 
        : (matchDetail.events || []);
      
      if (Array.isArray(liveEvents)) {
        for (const item of liveEvents) {
          // 'G' = Goal, 'P' = Penalty (we ignore 'O' = Own Goal)
          if ((item.type === 'G' || item.type === 'P') && item.personId) {
             const plId = String(item.personId);
             
             // Convert the PulseLive ID to our Database Player ID
             const player = await Player.findOne({ plId });
             if (player) {
               const dbId = player._id.toString();
               playerGoals[dbId] = (playerGoals[dbId] || 0) + 1;
             }
          }
        }
      }

      // ==========================================
      // 6. UPDATE DATABASE (Same Logic as Admin UI)
      // ==========================================

      await Match.findByIdAndUpdate(dbMatch._id, {
        isFinished,
        scoreTeamA,
        scoreTeamB,
        playerGoals
      });

      const picks = await Pick.find({ matchId: dbMatch._id });

      for (const pick of picks) {
        const goalsScored = playerGoals[pick.playerId.toString()] || 0;
        let points = 0;

        if (goalsScored > 0) {
          const player = await Player.findById(pick.playerId);
          let multiplier = 1; 
          
          if (player) {
            if (player.position === 'Midfielder') multiplier = 2;
            if (player.position === 'Defender') multiplier = 3;
            if (player.position === 'Goalkeeper') multiplier = 10;
          }
          points = goalsScored * multiplier;
        }

        await Pick.findByIdAndUpdate(pick._id, { goalsScored, points });
      }

      matchesProcessed++;
      
      // Pause briefly to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ success: true, matchesProcessed });

  } catch (error) {
    console.error('Auto-Score Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}