import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Pick from '@/models/Pick';
import Player from '@/models/Player';
import Link from 'next/link';
import MatchRow from '@/components/MatchRow';
import { getServerSession } from 'next-auth'; 
import { authOptions } from '@/lib/auth';

export default async function Home(props) {
  // 1. AUTH CHECK
  const session = await getServerSession(authOptions);

if (!session) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <h1 className="text-4xl font-extrabold mb-4">Premier League Picks</h1>
        <p className="text-gray-600 mb-8">You must be signed in to play.</p>
        <Link 
          href="/login"
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Sign In
        </Link>
      </main>
    );
  }

  // 2. Get the authenticated user's email to use as their ID
  const realUserId = session.user.email; 

  // 3. Connect to DB and get Gameweek
  await dbConnect();
  const searchParams = await props.searchParams;
  let activeGw = searchParams?.gw ? parseInt(searchParams.gw) : null;

  if (!activeGw) {
    const nextMatch = await Match.findOne({ isFinished: false }).sort({ kickoffTime: 1 });
    activeGw = nextMatch ? nextMatch.gameweek : 1;
  }

  // 4. Fetch base data
  const matches = await Match.find({ gameweek: activeGw }).sort({ kickoffTime: 1 });
  const allPlayers = await Player.find({ isInactive: false }).sort({ team: 1, squadNumber: 1 }).lean();

  // 5. GW19 Logic: Fetch the user's past picks
  const isFirstHalf = activeGw <= 19;
  const minGw = isFirstHalf ? 1 : 20;
  const maxGw = isFirstHalf ? 19 : 38;

  const allHalfSeasonPicks = await Pick.find({
    userId: realUserId, 
    gameweek: { $gte: minGw, $lte: maxGw }
  }).lean();

  // 6. SERIALIZATION: Strip out the MongoDB ObjectIds to prevent Client Component errors
  const serializedMatches = JSON.parse(JSON.stringify(matches));
  const serializedPlayers = JSON.parse(JSON.stringify(allPlayers));
  const serializedPicks = JSON.parse(JSON.stringify(allHalfSeasonPicks));

  // 7. Sort the serialized picks for the MatchRow props
  const currentGwPicksByMatch = {};
  const usedPlayerIds = [];

  serializedPicks.forEach(pick => {
    if (pick.gameweek === activeGw) {
      currentGwPicksByMatch[pick.matchId] = pick;
    } else {
      usedPlayerIds.push(pick.playerId);
    }
  });

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 min-h-screen">
      
{/* User Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">PL Picks</h1>
          <span className="text-xs text-gray-500 font-medium">
            Logged in as {session.user.email}
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Link 
            href="/leaderboard" 
            className="bg-gray-900 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            🏆 Leaderboard
          </Link>
          <Link 
            href="/api/auth/signout" 
            className="text-sm text-red-500 hover:underline"
          >
            Logout
          </Link>
        </div>
      </div>

      <div className="flex justify-between items-center bg-indigo-900 text-white p-4 rounded-xl mb-8 shadow-lg">
        {activeGw > 1 ? (
          <Link href={`/?gw=${activeGw - 1}`} className="px-4 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition">◀ Prev</Link>
        ) : <div className="w-20"></div>}
        <h2 className="text-xl md:text-2xl font-bold tracking-wider">GAMEWEEK {activeGw}</h2>
        {activeGw < 38 ? (
          <Link href={`/?gw=${activeGw + 1}`} className="px-4 py-2 bg-indigo-800 rounded-lg hover:bg-indigo-700 transition">Next ▶</Link>
        ) : <div className="w-20"></div>}
      </div>

      <div className="space-y-4">
        {serializedMatches.map((match) => {
          const matchIdStr = match._id;
          const userPick = currentGwPicksByMatch[matchIdStr];
          const teamAPlayers = serializedPlayers.filter(p => p.team === match.teamA);
          const teamBPlayers = serializedPlayers.filter(p => p.team === match.teamB);

          return (
            <MatchRow 
              key={matchIdStr}
              match={match}
              currentPick={userPick}
              teamAPlayers={teamAPlayers}
              teamBPlayers={teamBPlayers}
              usedPlayerIds={usedPlayerIds}
              userId={realUserId} // Successfully passing the email!
            />
          );
        })}

        {serializedMatches.length === 0 && (
          <div className="text-center text-gray-500 py-8">No matches found for this Gameweek.</div>
        )}
      </div>
    </main>
  );
}