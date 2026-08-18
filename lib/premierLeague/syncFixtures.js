import Match from '@/models/Match';

import { getCurrentSeason } from './getCurrentSeason';
import { getSeasonFixtures } from './getFixtures';

import {
  getFixtureId,
  getGameweek,
  getTeams,
  getKickoffTime,
  getFixtureStatus,
} from './fixtureHelpers';


export async function syncPremierLeagueFixtures() {
  const startedAt = new Date();

  const stats = {
    seasonId: null,
    seasonLabel: null,

    fixturesFound: 0,
    fixturesInserted: 0,
    fixturesUpdated: 0,
    fixturesUnchanged: 0,

    kickoffChanges: 0,
    teamChanges: 0,

    errors: [],
    changes: [],
  };


  /*
   * --------------------------------------------------
   * CURRENT SEASON
   * --------------------------------------------------
   */

  const season =
    await getCurrentSeason();

  stats.seasonId = season.id;
  stats.seasonLabel = season.label;


  /*
   * --------------------------------------------------
   * GET ALL FIXTURES
   * --------------------------------------------------
   */

  const fixtures =
    await getSeasonFixtures(
      season.id
    );
    console.log(
  JSON.stringify(fixtures[0], null, 2)
);

  stats.fixturesFound =
    fixtures.length;


  /*
   * Safety check.
   *
   * A normal Premier League season should eventually
   * contain 380 fixtures.
   *
   * At the beginning of the season it may temporarily
   * contain fewer, so don't insist on exactly 380.
   */

  if (fixtures.length < 10) {
    throw new Error(
      `Only ${fixtures.length} fixtures returned. Aborting fixture sync.`
    );
  }


  /*
   * --------------------------------------------------
   * PROCESS FIXTURES
   * --------------------------------------------------
   */

  for (const fixture of fixtures) {
    try {
      const plMatchId =
        getFixtureId(fixture);

      if (!plMatchId) {
        stats.errors.push(
          'Fixture without PulseLive match ID'
        );

        continue;
      }


      const teams =
        getTeams(fixture);

      if (!teams) {
        stats.errors.push(
          `Fixture ${plMatchId}: could not determine teams`
        );

        continue;
      }


      const gameweek =
        getGameweek(fixture);

      if (!gameweek) {
        stats.errors.push(
          `${teams.teamA} v ${teams.teamB}: missing gameweek`
        );

        continue;
      }


      const kickoffTime =
        getKickoffTime(fixture);

      if (!kickoffTime) {
        stats.errors.push(
          `${teams.teamA} v ${teams.teamB}: missing kickoff time`
        );

        continue;
      }


      /*
       * ------------------------------------------------
       * FIND EXISTING MATCH
       * ------------------------------------------------
       */

      let match =
        await Match.findOne({
          plMatchId,
        });


      /*
       * ------------------------------------------------
       * NEW MATCH
       * ------------------------------------------------
       */

      if (!match) {
        match = await Match.create({
          plMatchId,

          gameweek,

          teamA: teams.teamA,
          teamB: teams.teamB,

          kickoffTime,

          isFinished:
            false,
        });

        stats.fixturesInserted++;

        continue;
      }


      /*
       * ------------------------------------------------
       * DETECT CHANGES
       * ------------------------------------------------
       */

      const changes = {};


      /*
       * Kickoff change
       */

      const oldKickoff =
        match.kickoffTime
          ? new Date(
              match.kickoffTime
            ).getTime()
          : null;

      const newKickoff =
        kickoffTime.getTime();


      if (
        oldKickoff !==
        newKickoff
      ) {
        changes.kickoffTime = {
          old:
            match.kickoffTime?.toISOString(),
          new:
            kickoffTime.toISOString(),
        };

        stats.kickoffChanges++;
      }


      /*
       * Team changes
       *
       * This should almost never happen, but keeping the
       * check makes the synchroniser robust.
       */

      if (
        match.teamA !==
          teams.teamA ||
        match.teamB !==
          teams.teamB
      ) {
        changes.teams = {
          old: {
            teamA: match.teamA,
            teamB: match.teamB,
          },

          new: {
            teamA: teams.teamA,
            teamB: teams.teamB,
          },
        };

        stats.teamChanges++;
      }


      /*
       * Gameweek change
       */

      if (
        match.gameweek !==
        gameweek
      ) {
        changes.gameweek = {
          old: match.gameweek,
          new: gameweek,
        };
      }


      /*
       * ------------------------------------------------
       * UPDATE
       * ------------------------------------------------
       */

      if (
        Object.keys(changes).length > 0
      ) {
        await Match.updateOne(
          { plMatchId },

          {
            $set: {
              gameweek,

              teamA: teams.teamA,
              teamB: teams.teamB,

              kickoffTime,
            },
          }
        );

        stats.fixturesUpdated++;

        stats.changes.push({
          plMatchId,

          fixture:
            `${teams.teamA} v ${teams.teamB}`,

          changes,
        });
      } else {
        /*
         * Even if the fixture hasn't changed, make sure
         * completed status is kept current.
         */

        const isFinished =
          getFixtureStatus(
            fixture
          ) === 'C';

        if (
          match.isFinished !==
          isFinished
        ) {
          await Match.updateOne(
            { plMatchId },

            {
              $set: {
                isFinished,
              },
            }
          );

          stats.fixturesUpdated++;
        } else {
          stats.fixturesUnchanged++;
        }
      }
    } catch (error) {
      stats.errors.push(
        error.message
      );
    }
  }


  /*
   * --------------------------------------------------
   * FINAL SAFETY CHECK
   * --------------------------------------------------
   */

  if (
    stats.fixturesFound < 10
  ) {
    throw new Error(
      'Fixture sync returned suspiciously few fixtures.'
    );
  }


  const finishedAt =
    new Date();


  console.log(
    'Premier League fixture sync completed:',
    {
      season: season.label,

      fixtures:
        stats.fixturesFound,

      inserted:
        stats.fixturesInserted,

      updated:
        stats.fixturesUpdated,

      unchanged:
        stats.fixturesUnchanged,

      kickoffChanges:
        stats.kickoffChanges,

      teamChanges:
        stats.teamChanges,

      errors:
        stats.errors.length,
    }
  );


  return {
    success:
      stats.errors.length === 0,

    startedAt,
    finishedAt,

    ...stats,
  };
}