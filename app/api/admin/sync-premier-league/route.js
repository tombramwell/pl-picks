import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

import { syncPremierLeaguePlayers } from '@/lib/premierLeague/syncPlayers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log('SYNC API: No session found');

      return NextResponse.json(
        {
          success: false,
          error: 'No authenticated session',
        },
        { status: 401 }
      );
    }

    console.log(
      'SYNC API USER:',
      session.user?.email
    );

    if (
      session.user?.email !==
      'tom.bramwell@reachplc.com'
    ) {
      console.log(
        'SYNC API: Incorrect email:',
        session.user?.email
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Authenticated user is not authorised',
        },
        { status: 401 }
      );
    }

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
        error:
          error.message ||
          'Sync failed',
      },
      { status: 500 }
    );
  }
}