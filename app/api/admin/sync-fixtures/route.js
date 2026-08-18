import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

import {
  syncPremierLeagueFixtures,
} from '@/lib/premierLeague/syncFixtures';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session =
      await getServerSession(authOptions);

    console.log(
      'FIXTURE SYNC SESSION:',
      session
    );

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'No authenticated session',
        },
        { status: 401 }
      );
    }

    if (
      session.user?.email !==
      'tom.bramwell@reachplc.com'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authenticated user is not authorised',
        },
        { status: 401 }
      );
    }

    console.log(
      'Manual Premier League fixture sync started'
    );

    const result =
      await syncPremierLeagueFixtures();

    console.log(
      'Manual Premier League fixture sync completed'
    );

    return NextResponse.json({
      ...result,
      trigger: 'manual',
    });

  } catch (error) {
    console.error(
      'Manual Premier League fixture sync failed:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'Fixture sync failed',
      },
      { status: 500 }
    );
  }
}