import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Entrant from '@/models/Entrant';

const ADMIN_EMAILS = ['tom.bramwell@reachplc.com'];

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ADMIN_EMAILS.includes(session.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, hasPaid } = await req.json();
    await dbConnect();

    const entrant = await Entrant.findOneAndUpdate(
      { email },
      { email, hasPaid },
      { upsert: true, new: true } // Creates it if they don't exist yet
    );

    return NextResponse.json({ success: true, entrant });
  } catch (error) {
    console.error("Admin Update Error:", error);
    return NextResponse.json({ error: "Failed to update entrant" }, { status: 500 });
  }
}