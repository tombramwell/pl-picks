import Match from '@/models/Match';

import { getCurrentSeason } from './getCurrentSeason';
import { getSeasonFixtures } from './getFixtures';

import {
  getFixtureId,
  getGameweek,
  getTeams,
  getKickoffTime,
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
    gameweekChanges: 0,

    errors: [],
    changes: [],
  };


  // --------------------------------------------------
  // CURRENT SEASON
  // --------------------------------------------------

  const season =
    await getCurrentSeason();

  stats.seasonId = season.id;
  stats.seasonLabel = season.label;


  // --------------------------------------------------
  // GET ALL PREMIER LEAGUE FIXTURES
  // --------------------------------------------------

  const fixtures =
    await getSeasonFixtures(
      season.id
    );

  stats.fixturesFound =
    fixtures.length;


  if (fixtures.length < 10) {
    throw new Error(
      `Only ${fixtures.length} fixtures returned. Aborting sync.`
    );
  }


  // --------------------------------------------------
  // GET ALL EXISTING MATCHES ONCE
  // --------------------------------------------------

  const existingMatches =
    await Match.find().lean();


  console.log(
    `Loaded ${existingMatches.length} existing matches from MongoDB`
  );


  // --------------------------------------------------
  // BUILD LOOKUP MAPS
  // --------------------------------------------------

  const byPlMatchId =
    new Map();

  const byFixtureDetails =
    new Map();


  for (const match of existingMatches) {

    if (match.plMatchId) {
      byPlMatchId.set(
        String(match.plMatchId),
        match
      );
    }


    /*
     * Used to match old records that don't yet have
     * a PulseLive match ID.
     */

    const key =
      `${match.gameweek}|${match.teamA}|${match.teamB}`;

    byFixtureDetails.set(
      key,
      match
    );
  }


  // --------------------------------------------------
  // BUILD BULK OPERATIONS
  // --------------------------------------------------

  const operations = [];


  for (const fixture of fixtures) {

    try {

      const plMatchId =
        getFixtureId(fixture);

      const gameweek =
        getGameweek(fixture);

      const teams =
        getTeams(fixture);

      const kickoffTime =
        getKickoffTime(fixture);


      // ----------------------------------------------
      // VALIDATE
      // ----------------------------------------------

      if (!plMatchId) {
        stats.errors.push(
          'Fixture has no PulseLive ID'
        );

        continue;
      }


      if (!gameweek) {
        stats.errors.push(
          `Fixture ${plMatchId}: no gameweek`
        );

        continue;
      }


      if (!teams) {
        stats.errors.push(
          `Fixture ${plMatchId}: no teams`
        );

        continue;
      }


      if (!kickoffTime) {
        stats.errors.push(
          `${teams.teamA} v ${teams.teamB}: no kickoff time`
        );

        continue;
      }


      // ----------------------------------------------
      // FIND EXISTING MATCH IN MEMORY
      // ----------------------------------------------

      let existing =
        byPlMatchId.get(
          plMatchId
        );


      /*
       * If this is an old match which doesn't yet have
       * a plMatchId, try matching it by gameweek/team.
       */

      if (!existing) {

        const key =
          `${gameweek}|${teams.teamA}|${teams.teamB}`;

        existing =
          byFixtureDetails.get(
            key
          );
      }


      // ----------------------------------------------
      // NEW MATCH
      // ----------------------------------------------

      if (!existing) {

        operations.push({
          insertOne: {
            document: {
              plMatchId,

              gameweek,

              teamA:
                teams.teamA,

              teamB:
                teams.teamB,

              kickoffTime,

              isFinished: false,
            },
          },
        });

        stats.fixturesInserted++;

        continue;
      }


      // ----------------------------------------------
      // EXISTING MATCH
      // ----------------------------------------------

      const changes = {};

      const oldKickoff =
        existing.kickoffTime
          ? new Date(
              existing.kickoffTime
            ).getTime()
          : null;

      const newKickoff =
        kickoffTime.getTime();


      // ----------------------------------------------
      // KICKOFF CHANGE
      // ----------------------------------------------

      if (
        oldKickoff !==
        newKickoff
      ) {

        changes.kickoffTime = {
          old:
            existing.kickoffTime
              ? new Date(
                  existing.kickoffTime
                ).toISOString()
              : null,

          new:
            kickoffTime.toISOString(),
        };

        stats.kickoffChanges++;
      }


      // ----------------------------------------------
      // TEAM CHANGE
      // ----------------------------------------------

      if (
        existing.teamA !==
          teams.teamA ||
        existing.teamB !==
          teams.teamB
      ) {

        changes.teams = {
          old: {
            teamA:
              existing.teamA,

            teamB:
              existing.teamB,
          },

          new: {
            teamA:
              teams.teamA,

            teamB:
              teams.teamB,
          },
        };

        stats.teamChanges++;
      }


      // ----------------------------------------------
      // GAMEWEEK CHANGE
      // ----------------------------------------------

      if (
        existing.gameweek !==
        gameweek
      ) {

        changes.gameweek = {
          old:
            existing.gameweek,

          new:
            gameweek,
        };

        stats.gameweekChanges++;
      }


      // ----------------------------------------------
      // PULSELIVE ID WAS MISSING
      // ----------------------------------------------

      if (
        String(existing.plMatchId || '') !==
        plMatchId
      ) {
        changes.plMatchId = {
          old:
            existing.plMatchId ||
            null,

          new:
            plMatchId,
        };
      }


      // ----------------------------------------------
      // ADD UPDATE OPERATION
      // ----------------------------------------------

      if (
        Object.keys(changes).length > 0
      ) {

        operations.push({
          updateOne: {
            filter: {
              _id: existing._id,
            },

            update: {
              $set: {
                plMatchId,

                gameweek,

                teamA:
                  teams.teamA,

                teamB:
                  teams.teamB,

                kickoffTime,
              },
            },
          },
        });


        stats.fixturesUpdated++;

        stats.changes.push({
          plMatchId,

          fixture:
            `${teams.teamA} v ${teams.teamB}`,

          changes,
        });

      } else {

        stats.fixturesUnchanged++;
      }


    } catch (error) {

      console.error(
        'Error processing fixture:',
        error
      );

      stats.errors.push(
        error.message
      );
    }
  }


  // --------------------------------------------------
  // EXECUTE ALL DATABASE CHANGES
  // --------------------------------------------------

  console.log(
    `Executing ${operations.length} MongoDB bulk operations`
  );


  if (operations.length > 0) {

    await Match.bulkWrite(
      operations,
      {
        ordered: false,
      }
    );
  }


  // --------------------------------------------------
  // FINISHED
  // --------------------------------------------------

  const finishedAt =
    new Date();


  console.log(
    'Premier League fixture sync completed:',
    {
      season:
        stats.seasonLabel,

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

      gameweekChanges:
        stats.gameweekChanges,

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
    success:
      stats.errors.length === 0,

    startedAt,
    finishedAt,

    ...stats,
  };
}