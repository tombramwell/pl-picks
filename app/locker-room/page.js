import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Pick from '@/models/Pick';
import Player from '@/models/Player';
import Link from 'next/link';

export const revalidate = 0; // Ensure data is always fresh

export default async function LockerRoomPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 border-2 border-barclays-blue shadow-lg text-center">
          <h2 className="text-xl font-black uppercase text-barclays-dark mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6 font-bold uppercase tracking-wider text-sm">You must be logged in to view your locker room.</p>
          <Link href="/api/auth/signin" className="bg-barclays-blue text-white px-6 py-3 font-black uppercase tracking-widest hover:bg-barclays-dark transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userId = session.user.email;
  const displayName = userId.split('@')[0];

  await dbConnect();

  // 1. Fetch all picks for this user, sorted by Gameweek
  const picks = await Pick.find({ userId }).sort({ gameweek: 1 }).lean();

  // 2. Fetch the corresponding Player details (to get exact position/team formatting)
  const playerIds = picks.map(p => p.playerId);
  const players = await Player.find({ _id: { $in: playerIds } }).lean();

  // 3. Map the data together
  const lockerRoom = picks.map(pick => {
    const player = players.find(p => p._id.toString() === pick.playerId.toString());
    return {
      ...pick,
      position: player?.position || 'Unknown',
      team: player?.team || pick.playerTeam,
    };
  });

  // Calculate totals for the header
  const totalPlayersUsed = lockerRoom.length;
  const totalGoals = lockerRoom.reduce((sum, p) => sum + (p.goalsScored || 0), 0);

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Broadcast Style Header */}
      <div className="bg-gradient-to-b from-barclays-blue to-barclays-dark text-white p-6 border-b-4 border-barclays-cyan mb-6 shadow-md flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic truncate">
            {displayName}'s <span className="text-barclays-cyan">Locker Room</span>
          </h1>
          <span className="text-xs text-gray-300 font-bold tracking-widest uppercase mt-1 block">
            Used Players Directory
          </span>
        </div>
        <Link href="/" className="text-xs font-bold uppercase tracking-widest text-barclays-cyan hover:text-white transition shrink-0 bg-white/10 px-4 py-2 border border-white/20">
          ◀ BACK TO PICKS
        </Link>
      </div>

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white border-2 border-gray-300 p-4 text-center shadow-sm">
          <span className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Players Used</span>
          <span className="text-3xl font-black text-barclays-dark">{totalPlayersUsed}</span>
        </div>
        <div className="bg-white border-2 border-gray-300 p-4 text-center shadow-sm">
          <span className="block text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Goals Scored</span>
          <span className="text-3xl font-black text-barclays-dark">{totalGoals}</span>
        </div>
      </div>

      {/* The Locker Room Grid */}
      {lockerRoom.length === 0 ? (
        <div className="bg-white border-2 border-gray-300 p-12 text-center shadow-sm">
          <span className="text-4xl block mb-4">👕</span>
          <h3 className="text-xl font-black uppercase text-gray-400 tracking-widest">Empty Locker Room</h3>
          <p className="text-sm font-bold text-gray-400 mt-2">You haven't locked in any players yet this season.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {lockerRoom.map((player) => (
            <div 
              key={player._id.toString()} 
              className="bg-white border-2 border-gray-300 shadow-sm relative group flex flex-col transition hover:-translate-y-1 hover:shadow-md hover:border-barclays-cyan"
            >
              {/* Header: Gameweek */}
              <div className="bg-gray-100 border-b-2 border-gray-300 p-2 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Gameweek {player.gameweek}
                </span>
                {/* Visual indicator of position */}
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 text-white ${
                  player.position === 'Forward' ? 'bg-red-500' : 
                  player.position === 'Midfielder' ? 'bg-green-600' : 
                  player.position === 'Defender' ? 'bg-blue-500' : 'bg-yellow-500 text-black'
                }`}>
                  {player.position.substring(0, 3)}
                </span>
              </div>

              {/* Body: Player Name & Team */}
              <div className="p-4 flex-grow flex flex-col justify-center items-center text-center bg-[url('/noise.png')]">
                <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-barclays-dark leading-tight mb-1">
                  {player.playerName}
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {player.team}
                </span>
              </div>

              {/* Footer: Outcome */}
              {player.goalsScored === undefined || player.goalsScored === null ? (
                 <div className="bg-gray-200 p-3 text-center border-t-2 border-gray-300">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pending</span>
                 </div>
              ) : player.goalsScored > 0 ? (
                <div className="bg-barclays-blue p-3 text-center border-t-4 border-barclays-cyan">
                  <span className="text-xs font-black uppercase tracking-widest text-white block">
                    {player.goalsScored} ⚽ / {player.points} PTS
                  </span>
                </div>
              ) : (
                <div className="bg-red-600 p-3 text-center border-t-2 border-red-700">
                  <span className="text-xs font-black uppercase tracking-widest text-white block">
                    Blank (0 PTS)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}