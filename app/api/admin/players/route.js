import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Fetch all active players for the admin list
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  
  try {
    const activePlayers = await Player.find({ isInactive: false }).sort({ team: 1, name: 1 }).lean();
    return NextResponse.json({ players: activePlayers });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Mark a specific player as inactive
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();
  
  try {
    const { playerId } = await request.json();
    await Player.findByIdAndUpdate(playerId, { 
      $set: { 
        isInactive: true,
        lastSynced: new Date() // Updates timestamp so the scraper knows we touched it
      } 
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}