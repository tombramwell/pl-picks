import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Match from '@/models/Match';
import Player from '@/models/Player';
import matchesData from '@/data/matches.json';
import playersData from '@/data/players.json';

export async function POST(request) {
  await dbConnect();

  // 1. Strict Security: Ensure only YOU can run this script
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.isAdmin !== true) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 2. Clear out the old test data (ONLY for Matches and Players, leave Users & Picks alone!)
    await Match.deleteMany({});
    await Player.deleteMany({});

    // 3. Bulk insert the real data
    const matchesInserted = await Match.insertMany(matchesData);
    const playersInserted = await Player.insertMany(playersData);

    return NextResponse.json({ 
      success: true, 
      message: 'Real tournament data successfully imported!',
      matchesCount: matchesInserted.length,
      playersCount: playersInserted.length
    });

  } catch (error) {
    console.error("Bulk Import Error:", error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}