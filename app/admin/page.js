import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import AdminMatchCard from '@/components/AdminMatchCard';
import BulkImportButton from '@/components/BulkImportButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await dbConnect();

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) redirect('/login');

    try {
    // Decode the token and check the isAdmin flag
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // If they are not an admin, boot them back to the dashboard immediately
    if (decoded.isAdmin !== true) {
      redirect('/');
    }
  } catch (error) {
    redirect('/login');
  }

  // Fetch all matches, sorted by kickoff time (oldest/current matches first so they are easy to score)
  const matches = await Match.find().sort({ kickoffTime: 1 }).lean();

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 text-red-600">
          Admin Control Center
        </h1>
        {/* <p className="text-gray-600 mt-2">Update final scores and trigger points calculations.</p>
        <BulkImportButton /> */}
      </header>

      <section>
        {matches.map((match) => (
          <AdminMatchCard 
            key={match._id.toString()} 
            match={{ ...match, _id: match._id.toString() }} 
          />
        ))}
      </section>
    </main>
  );
}