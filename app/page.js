import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import Pick from '@/models/Pick';
import MatchRow from '@/components/MatchRow';

export default async function DashboardPage(props) {
  // 1. Check Authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }

  await dbConnect();

  const normalizeTeamName = (teamName) => {
    if (!teamName) return '';
    return teamName.toLowerCase().replace(' & ', ' and ').trim();
  };

  // 2. Fetch Data
  const matches = await Match.find().sort({ kickoffTime: 1 }).lean();
  const players = await Player.find().lean();
  const userPicks = await Pick.find({ userId: session.user.email }).lean();

  // 3. Process Gameweeks & Deadlines
  const now = new Date();
  
  // Find all unique gameweeks in the database
  const allGameweeks = [...new Set(matches.map(m => m.gameweek))].sort((a, b) => a - b);
  
  // -- SMART MIDNIGHT CUTOFF LOGIC --
  let defaultGw = allGameweeks[allGameweeks.length - 1] || 1; // Default to the last GW if season is over

  for (const gw of allGameweeks) {
    const gwMatches = matches.filter(m => m.gameweek === gw);
    if (gwMatches.length === 0) continue;

    // The matches are pre-sorted chronologically, so the last one is the final match of the Gameweek
    const lastMatch = gwMatches[gwMatches.length - 1]; 
    
    // Calculate 11:59:59 PM on the day of that final match
    const cutoffTime = new Date(lastMatch.kickoffTime);
    cutoffTime.setHours(23, 59, 59, 999); 

    // If we haven't reached midnight on the day of the final match, this is our active gameweek!
    if (now <= cutoffTime) {
      defaultGw = gw;
      break;
    }
  }

  // 4. Determine which Gameweek to show
  // Await searchParams for Next.js 15 compatibility
  const searchParams = await props.searchParams;
  const requestedGw = parseInt(searchParams?.gw);
  
  // Allow viewing ANY gameweek that exists in the database
  const selectedGw = (requestedGw && allGameweeks.includes(requestedGw)) ? requestedGw : defaultGw;

  // 5. Filter matches for the selected Gameweek
  const displayMatches = matches.filter(m => m.gameweek === selectedGw);

  // 6. Process Picks and Players for the UI
  
  // Determine if the Gameweek currently being viewed is in the first or second half of the season
  const isSecondHalf = selectedGw >= 20;

  // Filter the user's historical picks based on the half of the season they are viewing
  const relevantPicks = userPicks.filter(p => {
    if (isSecondHalf) {
      return p.gameweek >= 20; // Only look at picks made from GW20 onwards
    } else {
      return p.gameweek <= 19; // Only look at picks made between GW1 and GW19
    }
  });

  // Generate the locked player list based ONLY on the relevant half of the season
  const usedPlayerIds = relevantPicks.map(p => p.playerId.toString());

  const userPicksMap = {};
  userPicks.forEach(pick => {
    userPicksMap[pick.matchId.toString()] = {
      ...pick,
      _id: pick._id.toString(),
      matchId: pick.matchId.toString(),
      playerId: pick.playerId.toString()
    };
  });

  const playersByTeam = {};
  players.forEach(p => {
    const normalizedTeam = normalizeTeamName(p.team);
    if (!playersByTeam[normalizedTeam]) playersByTeam[normalizedTeam] = [];
    playersByTeam[normalizedTeam].push({
      ...p,
      _id: p._id.toString()
    });
  });

  const serializedMatches = displayMatches.map(m => ({
    ...m,
    _id: m._id.toString(),
    kickoffTime: m.kickoffTime.toISOString()
  }));

  // 7. Render Retro Dashboard
  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Classic Barclays-style Header Banner */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-6 shadow-md">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Premiership <span className="text-barclays-cyan">Picks</span>
            </h1>
            <span className="text-xs text-barclays-cyan font-bold tracking-widest uppercase mt-1 block">
              Logged in: {session.user.email}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
            <Link 
              href="/rules" 
              className="text-sm text-barclays-cyan hover:text-white uppercase font-bold tracking-wider"
            >
              Rules
            </Link>
            <Link 
              href="/leaderboard" 
              className="bg-barclays-cyan text-barclays-dark text-sm font-black uppercase tracking-wider px-4 py-2 hover:bg-white transition border border-transparent hover:border-barclays-cyan"
            >
              Leaderboard
            </Link>
            <Link 
              href="/api/auth/signout" 
              className="text-sm text-gray-400 hover:text-white uppercase font-bold tracking-wider"
            >
              Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Gameweek Tab Selector */}
      {allGameweeks.length > 0 ? (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
          {allGameweeks.map(gw => (
            <Link 
              key={gw} 
              href={`/?gw=${gw}`}
              className={`shrink-0 px-6 py-3 font-black uppercase tracking-widest border-2 transition ${
                selectedGw === gw 
                  ? 'bg-barclays-blue text-white border-barclays-cyan shadow-md' 
                  : 'bg-white text-barclays-dark border-gray-300 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
              GW {gw}
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-red-500 p-4 mb-6 text-center font-bold text-red-600 uppercase tracking-widest">
          No Gameweeks Available
        </div>
      )}

      {/* Gameweek Subheader */}
      <div className="bg-white border-l-4 border-barclays-blue p-4 mb-6 shadow-sm flex justify-between items-center">
        <h2 className="text-xl font-black text-barclays-blue uppercase tracking-wide">
          Gameweek {selectedGw} Matches
        </h2>
        <div className="text-sm font-bold text-gray-500 uppercase hidden sm:block">
          Select 1 Player Per Match
        </div>
      </div>

      {/* Match Rows */}
      <div className="space-y-4">
        {serializedMatches.length > 0 ? (
          serializedMatches.map(match => (
            <MatchRow 
              key={match._id}
              match={match} 
              currentPick={userPicksMap[match._id]}
              teamAPlayers={playersByTeam[normalizeTeamName(match.teamA)] || []}
              teamBPlayers={playersByTeam[normalizeTeamName(match.teamB)] || []}
              usedPlayerIds={usedPlayerIds}
              userId={session.user.email}
            />
          ))
        ) : (
          <div className="bg-white border-2 border-gray-300 p-8 text-center text-gray-500 font-bold uppercase tracking-wider">
            No Matches Found For This Gameweek
          </div>
        )}
      </div>
    </main>
  );
}