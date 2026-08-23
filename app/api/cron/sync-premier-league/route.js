import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { syncPremierLeaguePlayers } from '@/lib/premierLeague/syncPlayers';

export const dynamic = 'force-dynamic';

// Pass 'request' into the GET function to read the headers correctly
export async function GET(request) {
  // 1. Security Check: Allow Vercel CRON *or* Logged-in Admin
  const authHeader = request.headers.get('authorization');
  const session = await getServerSession(authOptions);

  const isValidCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isValidAdmin = session && session.user; 

  if (!isValidCron && !isValidAdmin) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Premier League player sync started');
    
    await dbConnect();
    const result = await syncPremierLeaguePlayers();

    console.log('Premier League player sync completed');

    return NextResponse.json({
      ...result,
      trigger: isValidCron ? 'cron' : 'manual',
    });
    
  } catch (error) {
    console.error('Premier League sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
      },
      {
        status: 500,
      }
    );
  }
}