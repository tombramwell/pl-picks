import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import AdminDashboard from '@/components/AdminDashboard';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Strict access check
  if (!session || session.user?.email !== 'tom.bramwell@reachplc.com') {
    redirect('/');
  }

  await dbConnect();

  const matches = await Match.find().sort({ gameweek: 1, kickoffTime: 1 }).lean();
  const players = await Player.find().lean();

  // Safely serialize MongoDB objects for Client Component
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
        <p className="text-sm text-gray-500">Update scores and attribute goals</p>
      </div>
      <AdminDashboard matches={serializedMatches} players={serializedPlayers} />
    </main>
  );
}