import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import PlayerSync from '@/models/PlayerSync';
import Pick from '@/models/Pick';
import Entrant from '@/models/Entrant';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.email !== 'tom.bramwell@reachplc.com') {
    redirect('/');
  }

  await dbConnect();

  const matches = await Match.find().sort({ gameweek: 1, kickoffTime: 1 }).lean();
  const players = await Player.find().lean();
  const latestPlayerSync = await PlayerSync.findOne()
  .sort({ startedAt: -1 })
  .lean();

  const serializedLatestPlayerSync = latestPlayerSync
  ? {
      ...latestPlayerSync,
      _id: latestPlayerSync._id.toString(),
      startedAt: latestPlayerSync.startedAt
        ? new Date(latestPlayerSync.startedAt).toISOString()
        : null,
      finishedAt: latestPlayerSync.finishedAt
        ? new Date(latestPlayerSync.finishedAt).toISOString()
        : null,
    }
  : null;
  
  // Get all unique users who have made picks, plus their payment status
  const uniqueEmails = await Pick.distinct('userId');
  const entrants = await Entrant.find().lean();

  const managers = uniqueEmails.map(email => {
    const entrantData = entrants.find(e => e.email === email);
    return {
      email,
      hasPaid: entrantData?.hasPaid || false
    };
  });

  const serializedMatches = matches.map((m) => ({
    ...m,
    _id: m._id.toString(),
    kickoffTime: m.kickoffTime ? new Date(m.kickoffTime).toISOString() : new Date().toISOString(),
  }));

  const serializedPlayers = players.map((p) => ({
    ...p,
    _id: p._id.toString(),
  }));

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
      </div>
      <AdminDashboard matches={serializedMatches} players={serializedPlayers} managers={managers} latestPlayerSync={serializedLatestPlayerSync} />
    </main>
  );
}