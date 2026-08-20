import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { syncPremierLeaguePlayers } from '@/lib/premierLeague/syncPlayers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authHeader =
  headers().get('authorization');

if (
  authHeader !==
  `Bearer ${process.env.CRON_SECRET}`
) {
  return NextResponse.json(
    { success: false },
    { status: 401 }
  );
}

  try {
    console.log(
      'Manual Premier League player sync started'
    );
    await dbConnect();
    const result =
      await syncPremierLeaguePlayers();

    console.log(
      'Manual Premier League player sync completed'
    );

    return NextResponse.json({
      ...result,
      trigger: 'manual',
    });
  } catch (error) {
    console.error(
      'Manual Premier League sync failed:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        trigger: 'manual',
        error:
          error.message ||
          'Sync failed',
      },
      {
        status: 500,
      }
    );
  }
}