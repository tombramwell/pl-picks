import { NextResponse } from 'next/server';

import {
  syncPremierLeagueFixtures,
} from '@/lib/premierLeague/syncFixtures';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const authHeader =
    req.headers.get('authorization');

  if (
    process.env.CRON_SECRET &&
    authHeader !==
      `Bearer ${process.env.CRON_SECRET}`
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
    const result =
      await syncPremierLeagueFixtures();

    return NextResponse.json({
      ...result,
      trigger: 'cron',
    });
  } catch (error) {
    console.error(
      'Fixture cron error:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'Fixture sync failed',
      },
      {
        status: 500,
      }
    );
  }
}