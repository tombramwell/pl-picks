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

const WAIT_BETWEEN_TEAMS = 100;

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
    playersUnchanged: 0,

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
     * Safety check.
     *
     * If the API suddenly returns too few clubs,
     * don't proceed.
     */
    if (teams.length < 15) {
      throw new Error(
        `Only ${teams.length} Premier League clubs returned. Aborting sync.`
      );
    }

    /*
     * --------------------------------------------------
     * LOAD EXISTING PLAYERS ONCE
     * --------------------------------------------------
     *
     * This is the major performance improvement.
     *
     * The old version performed:
     *
     *   findOne()
     *   findOne()
     *   findOne()
     *   ...
     *
     * for every player.
     *
     * We now make ONE database read and keep the
     * existing players in memory.
     */

    const existingPlayers =
      await Player.find().lean();

    console.log(
      `Loaded ${existingPlayers.length} existing players from MongoDB`
    );

    /*
     * Map players by PulseLive ID.
     */

    const existingByPlId =
      new Map();

    for (const player of existingPlayers) {
      if (player.plId) {
        existingByPlId.set(
          String(player.plId),
          player
        );
      }
    }

    /*
     * Players seen during this successful sync.
     */
    const activePlayerIds = new Set();

    /*
     * --------------------------------------------------
     * BULK DATABASE OPERATIONS
     * --------------------------------------------------
     *
     * We build these while processing the clubs and
     * execute them after all clubs have been fetched.
     */

    const operations = [];

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

          const plId =
            String(rawPlayerId);

          activePlayerIds.add(plId);

          stats.playersProcessed++;

          const name =
            getPlayerName(player);

          const position =
            getPosition(player);

          const squadNumber =
            getSquadNumber(player);

          /*
           * ------------------------------------------------
           * FIND EXISTING PLAYER IN MEMORY
           * ------------------------------------------------
           */

          const existing =
            existingByPlId.get(plId);

          /*
           * ------------------------------------------------
           * NEW PLAYER
           * ------------------------------------------------
           */

          if (!existing) {
            operations.push({
              updateOne: {
                filter: {
                  plId,
                },

                update: {
                  $set: {
                    plId,

                    name,

                    team: team.name,
                    teamId: team.id,

                    position,

                    squadNumber,

                    isInactive: false,

                    seasonId: season.id,

                    lastSeenInSquad:
                      new Date(),

                    lastSynced:
                      new Date(),
                  },
                },

                upsert: true,
              },
            });

            stats.playersInserted++;

            teamCount++;

            continue;
          }

          /*
           * ------------------------------------------------
           * DETECT TRANSFER
           * ------------------------------------------------
           */

          const transferred =
            String(existing.teamId) !==
            String(team.id);

          if (transferred) {
            stats.transfersDetected++;

            console.log(
              `TRANSFER: ${name}: ` +
              `${existing.team} → ${team.name}`
            );
          }

          /*
           * ------------------------------------------------
           * DETECT SQUAD NUMBER CHANGE
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
           * DETECT OTHER CHANGES
           * ------------------------------------------------
           */

          const nameChanged =
            existing.name !== name;

          const positionChanged =
            existing.position !== position;

          const reactivated =
            existing.isInactive === true;

          const hasChanges =
            transferred ||
            squadNumberChanged ||
            nameChanged ||
            positionChanged ||
            reactivated;

          /*
           * ------------------------------------------------
           * BUILD UPDATE
           * ------------------------------------------------
           *
           * lastSeenInSquad and lastSynced are deliberately
           * updated every day even if nothing else changed.
           *
           * This is what allows the seven-day inactive
           * protection to work correctly.
           */

          const update = {
            name,

            team: team.name,
            teamId: team.id,

            position,

            squadNumber,

            isInactive: false,

            seasonId: season.id,

            lastSeenInSquad:
              new Date(),

            lastSynced:
              new Date(),
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

          /*
           * ------------------------------------------------
           * ADD DATABASE OPERATION
           * ------------------------------------------------
           */

          operations.push({
            updateOne: {
              filter: {
                _id: existing._id,
              },

              update: {
                $set: update,
              },
            },
          });

          if (hasChanges) {
            stats.playersUpdated++;
          } else {
            stats.playersUnchanged++;
          }

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

      /*
       * Keep the existing PulseLive rate-limit protection.
       */
      await wait(
        WAIT_BETWEEN_TEAMS
      );
    }

    /*
     * --------------------------------------------------
     * EXECUTE BULK PLAYER UPDATES
     * --------------------------------------------------
     */

    console.log(
      `Executing ${operations.length} player MongoDB bulk operations`
    );

    if (operations.length > 0) {
      await Player.bulkWrite(
        operations,
        {
          ordered: false,
        }
      );
    }

    /*
     * --------------------------------------------------
     * INACTIVE PLAYER CLEANUP
     * --------------------------------------------------
     *
     * Only run this if at least 18 clubs were successfully
     * processed.
     */

    if (stats.clubsSuccessful >= 18) {
      const inactiveBefore =
        new Date();

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
        }).lean();

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

    const finishedAt =
      new Date();

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

    console.log(
      'Premier League player sync completed:',
      {
        season:
          stats.seasonLabel,

        clubs:
          stats.clubsFound,

        successful:
          stats.clubsSuccessful,

        failed:
          stats.clubsFailed,

        processed:
          stats.playersProcessed,

        inserted:
          stats.playersInserted,

        updated:
          stats.playersUpdated,

        unchanged:
          stats.playersUnchanged,

        transfers:
          stats.transfersDetected,

        squadNumberChanges:
          stats.squadNumberChanges,

        inactive:
          stats.playersMarkedInactive,

        errors:
          stats.errors.length,

        duration:
          `${(
            (finishedAt - startedAt) /
            1000
          ).toFixed(1)} seconds`,
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

          finishedAt:
            new Date(),

          success: false,
        },
      }
    );

    throw error;
  }
}