import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import Pick from '@/models/Pick'; // Make sure to import Pick!
import Link from 'next/link';
import PickForm from './PickForm';

export default async function PickPage(props) {
  const params = await props.params;
  await dbConnect();

  const match = await Match.findById(params.matchId);
  
  if (!match) {
    return <div className="text-center mt-20 text-xl">Match not found.</div>;
  }

  const players = await Player.find({
    team: { $in: [match.teamA, match.teamB] },
    isInactive: false
  }).sort({ team: 1, squadNumber: 1 });

  // --- NEW: FETCH USED PLAYERS ---
  const dummyUserId = "64a1b2c3d4e5f6a7b8c9d0e1"; // Same dummy ID as the form
  const isFirstHalf = match.gameweek <= 19;
  const minGw = isFirstHalf ? 1 : 20;
  const maxGw = isFirstHalf ? 19 : 38;

  // Find all picks by this user in this half of the season (excluding this exact match)
  const pastPicks = await Pick.find({
    userId: dummyUserId,
    matchId: { $ne: match._id }, 
    gameweek: { $gte: minGw, $lte: maxGw }
  }).select('playerId');

  // Convert the array of objects into a simple array of ID strings
  const usedPlayerIds = pastPicks.map(p => p.playerId.toString());

  const serializedMatch = JSON.parse(JSON.stringify(match));
  const serializedPlayers = JSON.parse(JSON.stringify(players));

  return (
    <main className="max-w-xl mx-auto p-4 md:p-8 min-h-screen">
      <Link href={`/?gw=${match.gameweek}`} className="text-indigo-600 hover:underline mb-6 inline-block">
        &larr; Back to Gameweek {match.gameweek}
      </Link>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8 text-center">
        <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-2">
          Gameweek {match.gameweek}
        </p>
        <div className="flex justify-center items-center space-x-4 text-2xl font-black text-gray-900">
          <span className="w-2/5 text-right">{match.teamA}</span>
          <span className="text-gray-300 text-lg font-normal w-1/5">VS</span>
          <span className="w-2/5 text-left">{match.teamB}</span>
        </div>
      </div>

      {/* Pass the usedPlayerIds down to the form! */}
      <PickForm 
        match={serializedMatch} 
        players={serializedPlayers} 
        usedPlayerIds={usedPlayerIds} 
      />
    </main>
  );
}