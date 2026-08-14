import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Player from '@/models/Player';

const API_BASE = 'https://footballapi.pulselive.com/football';

const COMPETITION_ID = 1;
const SEASON_ID = 841;

const headers = {
  Origin: 'https://www.premierleague.com',
  Referer: 'https://www.premierleague.com/',
  account: 'premierleague',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

/**
 * Small helper for PulseLive requests.
 */
async function pulseLiveFetch(url) {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    throw new Error(
      `PulseLive ${response.status} ${response.statusText}: ${body.slice(0, 300)}`
    );
  }

  return response.json();
}

/**
 * Get all Premier League teams belonging to the season.
 *
 * This means we don't need to hard-code club IDs.
 */
async function getSeasonTeams() {
  const params = new URLSearchParams({
    comps: String(COMPETITION_ID),
    compSeasons: String(SEASON_ID),
    page: '0',
    pageSize: '100',
    altIds: 'true',
  });

  const url = `${API_BASE}/teams?${params.toString()}`;

  console.log('Fetching PL teams:', url);

  const data = await pulseLiveFetch(url);

  if (!Array.isArray(data.content)) {
    throw new Error('Unexpected response from /football/teams');
  }

  return data.content
    .map((team) => {
      /*
       * The current response normally contains the club
       * information inside `club`.
       */
      const club = team.club || team;

      return {
        id: Number(club.id),
        name:
          club.name ||
          club.shortName ||
          team.name ||
          team.shortName ||
          'Unknown',
      };
    })
    .filter((team) => Number.isInteger(team.id));
}

/**
 * Get the squad for a specific club and season.
 *
 * This is the important change from your original code.
 */
async function getTeamSquad(teamId) {
  const params = new URLSearchParams({
    altIds: 'true',
    compCodeForActivePlayer: 'EN_PR',
  });

  const url =
    `${API_BASE}/teams/${teamId}/compseasons/${SEASON_ID}/staff?` +
    params.toString();

  console.log(`Fetching squad for team ${teamId}:`, url);

  const data = await pulseLiveFetch(url);

  if (!Array.isArray(data.players)) {
    throw new Error(
      `Unexpected squad response for team ${teamId}`
    );
  }

  return data.players;
}

/**
 * Convert PulseLive position codes into your game's positions.
 */
function getPosition(player) {
  const position = player?.info?.position;

  switch (position) {
    case 'G':
      return 'Goalkeeper';

    case 'D':
      return 'Defender';

    case 'M':
      return 'Midfielder';

    case 'F':
      return 'Forward';

    default:
      return 'Unknown';
  }
}

/**
 * Main GET endpoint.
 */
export async function GET() {
  try {
    await dbConnect();

    let totalAddedOrUpdated = 0;

    const results = [];

    /*
     * ---------------------------------------------------------
     * STEP 1
     * Discover the actual 2026/27 Premier League clubs.
     * ---------------------------------------------------------
     */
    const teams = await getSeasonTeams();

    console.log(
      `Found ${teams.length} Premier League teams for season ${SEASON_ID}`
    );

    /*
     * This should be 20.
     */
    if (teams.length !== 20) {
      console.warn(
        `Expected 20 teams but PulseLive returned ${teams.length}`
      );
    }

    /*
     * ---------------------------------------------------------
     * STEP 2
     * Get each team's squad.
     * ---------------------------------------------------------
     */
    for (const team of teams) {
      try {
        const players = await getTeamSquad(team.id);

        let teamCount = 0;

        for (const p of players) {
          /*
           * Some PulseLive responses expose playerId while
           * others expose id. Handle both.
           */
          const playerId = p.id ?? p.playerId;

          if (playerId == null) {
            console.warn(
              `Skipping player without ID for ${team.name}`,
              p
            );

            continue;
          }

          const name =
            p.name?.display ||
            p.name?.first ||
            p.name ||
            'Unknown';

          const position = getPosition(p);

          const squadNumber =
            p.info?.shirtNum ??
            p.shirtNum ??
            99;

          /*
           * UPSERT
           *
           * Using the PulseLive player ID means that if a player
           * moves clubs, the same database player can be updated.
           */
          await Player.findOneAndUpdate(
            {
              plId: String(playerId),
            },
            {
              plId: String(playerId),
              name,
              team: team.name,
              position,
              squadNumber,
              isInactive: false,
            },
            {
              upsert: true,
              new: true,
            }
          );

          teamCount++;
          totalAddedOrUpdated++;
        }

        results.push({
          team: team.name,
          teamId: team.id,
          players: teamCount,
          success: true,
        });

        console.log(
          `${team.name} (${team.id}): ${teamCount} players synced`
        );

        /*
         * Give PulseLive a short break between requests.
         */
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      } catch (error) {
        console.error(
          `Error processing ${team.name} (${team.id}):`,
          error
        );

        results.push({
          team: team.name,
          teamId: team.id,
          players: 0,
          success: false,
          error: error.message,
        });

        /*
         * Don't let one broken club stop the other 19.
         */
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      }
    }

    return NextResponse.json({
      success: true,
      seasonId: SEASON_ID,
      competitionId: COMPETITION_ID,
      teamsFound: teams.length,
      totalAddedOrUpdated,
      details: results,
    });
  } catch (error) {
    console.error('Fatal Seeder Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run seeder',
      },
      {
        status: 500,
      }
    );
  }
}