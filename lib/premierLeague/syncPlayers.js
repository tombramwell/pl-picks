import Player from '@/models/Player';
import PlayerSync from '@/models/PlayerSync';

import { getCurrentSeason } from './getCurrentSeason';
import { getSeasonTeams } from './getTeams';
import { getTeamSquad } from './getSquad';

import {
  getPosition,
  getPlayerId,
  getPlayerName,
  getSquadNumber,
} from './helpers';

const WAIT_BETWEEN_TEAMS = 1000;

/*
 * Players aren't immediately marked inactive if they disappear
 * from a single day's squad response.
 *
 * Seven days gives the API plenty of room for temporary omissions.
 */
const INACTIVE_AFTER_DAYS = 7;

function wait(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

export async function syncPremierLeaguePlayers() {
  const startedAt = new Date();

  const syncLog = await PlayerSync.create({
    startedAt,
    success: false,
  });

  const stats = {
    seasonId: null,
    seasonLabel: null,

    clubsFound: 0,
    clubsSuccessful: 0,
    clubsFailed: 0,

    playersProcessed: 0,
    playersInserted: 0,
    playersUpdated: 0,

    transfersDetected: 0,
    squadNumberChanges: 0,

    playersMarkedInactive: 0,

    errors: [],
    details: [],
  };

  try {
    /*
     * --------------------------------------------------
     * CURRENT SEASON
     * --------------------------------------------------
     */

    const season = await getCurrentSeason();

    stats.seasonId = season.id;
    stats.seasonLabel = season.label;

    /*
     * --------------------------------------------------
     * CURRENT CLUBS
     * --------------------------------------------------
     */

    const teams = await getSeasonTeams(
      season.id
    );

    stats.clubsFound = teams.length;

    /*
     * This is another safety check.
     *
     * If the API suddenly returns 2 clubs, don't proceed.
     */
    if (teams.length < 15) {
      throw new Error(
        `Only ${teams.length} Premier League clubs returned. Aborting sync.`
      );
    }

    /*
     * Players seen during this successful sync.
     */
    const activePlayerIds = new Set();

    /*
     * --------------------------------------------------
     * PROCESS CLUBS
     * --------------------------------------------------
     */

    for (const team of teams) {
      try {
        const players = await getTeamSquad(
          team.id,
          season.id
        );

        let teamCount = 0;

        for (const player of players) {
          const rawPlayerId =
            getPlayerId(player);

          if (rawPlayerId == null) {
            stats.errors.push(
              `${team.name}: player without ID`
            );

            continue;
          }

          const plId = String(rawPlayerId);

          activePlayerIds.add(plId);

          const name =
            getPlayerName(player);

          const position =
            getPosition(player);

          const squadNumber =
            getSquadNumber(player);

          /*
           * Check whether this player already exists.
           */
          const existing =
            await Player.findOne({ plId });

          /*
           * ------------------------------------------------
           * NEW PLAYER
           * ------------------------------------------------
           */

          if (!existing) {
            await Player.create({
              plId,

              name,

              team: team.name,
              teamId: team.id,

              position,

              squadNumber,

              isInactive: false,

              seasonId: season.id,

              lastSeenInSquad: new Date(),
              lastSynced: new Date(),
            });

            stats.playersInserted++;
            teamCount++;

            continue;
          }

          /*
           * ------------------------------------------------
           * TRANSFER DETECTION
           * ------------------------------------------------
           */

          const transferred =
            existing.teamId !== team.id;

          if (transferred) {
            stats.transfersDetected++;

            console.log(
              `TRANSFER: ${name}: ` +
              `${existing.team} → ${team.name}`
            );
          }

          /*
           * ------------------------------------------------
           * SQUAD NUMBER CHANGE
           * ------------------------------------------------
           */

          const squadNumberChanged =
            existing.squadNumber !==
            squadNumber;

          if (squadNumberChanged) {
            stats.squadNumberChanges++;

            console.log(
              `SQUAD NUMBER: ${name}: ` +
              `${existing.squadNumber} → ${squadNumber}`
            );
          }

          /*
           * ------------------------------------------------
           * UPDATE
           * ------------------------------------------------
           */

          const update = {
            name,

            team: team.name,
            teamId: team.id,

            position,

            squadNumber,

            isInactive: false,

            seasonId: season.id,

            lastSeenInSquad: new Date(),
            lastSynced: new Date(),
          };

          /*
           * Preserve previous club when a transfer happens.
           */
          if (transferred) {
            update.previousTeam =
              existing.team;

            update.previousTeamId =
              existing.teamId;
          }

          /*
           * Preserve previous squad number.
           */
          if (squadNumberChanged) {
            update.previousSquadNumber =
              existing.squadNumber;
          }

          await Player.updateOne(
            { plId },
            { $set: update }
          );

          stats.playersUpdated++;
          stats.playersProcessed++;
          teamCount++;
        }

        stats.clubsSuccessful++;

        stats.details.push({
          team: team.name,
          teamId: team.id,
          players: teamCount,
          success: true,
        });

        console.log(
          `${team.name}: ${teamCount} players`
        );
      } catch (error) {
        stats.clubsFailed++;

        stats.errors.push(
          `${team.name}: ${error.message}`
        );

        stats.details.push({
          team: team.name,
          teamId: team.id,
          players: 0,
          success: false,
          error: error.message,
        });

        console.error(
          `${team.name} FAILED:`,
          error
        );
      }

      await wait(
        WAIT_BETWEEN_TEAMS
      );
    }

    /*
     * --------------------------------------------------
     * SAFETY CHECK
     * --------------------------------------------------
     *
     * Don't mark players inactive if too many clubs failed.
     *
     * For example:
     *
     * 20 clubs
     * 19 successful
     * 1 failed
     *
     * That's probably okay.
     *
     * But if only 10 worked, we definitely don't want
     * thousands of players being marked inactive.
     */

    if (stats.clubsSuccessful >= 18) {
      const inactiveBefore = new Date();

      inactiveBefore.setDate(
        inactiveBefore.getDate() -
          INACTIVE_AFTER_DAYS
      );

      /*
       * Find players who haven't been seen in a squad
       * for at least seven days.
       */
      const stalePlayers =
        await Player.find({
          seasonId: season.id,

          isInactive: false,

          lastSeenInSquad: {
            $lt: inactiveBefore,
          },
        });

      if (stalePlayers.length > 0) {
        const staleIds =
          stalePlayers.map(
            (player) => player.plId
          );

        const result =
          await Player.updateMany(
            {
              plId: {
                $in: staleIds,
              },
            },
            {
              $set: {
                isInactive: true,
                lastSynced: new Date(),
              },
            }
          );

        stats.playersMarkedInactive =
          result.modifiedCount;
      }
    } else {
      stats.errors.push(
        'Inactive-player cleanup skipped because too many clubs failed.'
      );
    }

    /*
     * --------------------------------------------------
     * FINISH
     * --------------------------------------------------
     */

    const finishedAt = new Date();

    await PlayerSync.findByIdAndUpdate(
      syncLog._id,
      {
        $set: {
          ...stats,
          finishedAt,
          success:
            stats.clubsFailed === 0,
          startedAt,
        },
      }
    );

    return {
      success: true,
      ...stats,
      startedAt,
      finishedAt,
    };
  } catch (error) {
    console.error(
      'Premier League sync failed:',
      error
    );

    stats.errors.push(
      error.message
    );

    await PlayerSync.findByIdAndUpdate(
      syncLog._id,
      {
        $set: {
          ...stats,
          finishedAt: new Date(),
          success: false,
        },
      }
    );

    throw error;
  }
}