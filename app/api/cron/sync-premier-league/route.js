import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

import { syncPremierLeaguePlayers } from '@/lib/premierLeague/syncPlayers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session =
    await getServerSession(authOptions);

  if (
    !session ||
    session.user?.email !==
      'tom.bramwell@reachplc.com'
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      {
        status: 401,
      }
    );
  }

  try {
    console.log(
      'Manual Premier League player sync started'
    );

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