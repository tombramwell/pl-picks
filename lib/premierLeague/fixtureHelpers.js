export function getFixtureId(fixture) {
  if (!fixture?.id) {
    return null;
  }

  return String(fixture.id);
}


export function getTeams(fixture) {
  if (
    !Array.isArray(fixture?.teams) ||
    fixture.teams.length < 2
  ) {
    return null;
  }

  const home = fixture.teams[0];
  const away = fixture.teams[1];

  const teamA =
    home?.team?.name ||
    home?.name ||
    home?.team?.club?.name ||
    null;

  const teamB =
    away?.team?.name ||
    away?.name ||
    away?.team?.club?.name ||
    null;

  if (!teamA || !teamB) {
    return null;
  }

  return {
    teamA,
    teamB,
  };
}


export function getGameweek(fixture) {
  /*
   * Current/known PulseLive structures can expose
   * the gameweek in slightly different ways.
   */

  if (
    typeof fixture?.gameweek === 'number'
  ) {
    return fixture.gameweek;
  }

  if (
    typeof fixture?.gameweek?.gameweek === 'number'
  ) {
    return fixture.gameweek.gameweek;
  }

  if (
    typeof fixture?.gameweek?.id === 'number'
  ) {
    return fixture.gameweek.id;
  }

  if (
    typeof fixture?.gameweek?.gameweek === 'string'
  ) {
    return Number(
      fixture.gameweek.gameweek
    );
  }

  return null;
}


export function getKickoffTime(fixture) {
  /*
   * PulseLive's kickoff object normally contains
   * a millis value. This is the preferred value because
   * it represents the actual timestamp and avoids
   * manually dealing with BST/GMT.
   */

  const millis =
    fixture?.kickoff?.millis ??
    fixture?.provisionalKickoff?.millis;

  if (millis != null) {
    const date = new Date(
      Number(millis)
    );

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }


  /*
   * Fallbacks.
   */

  const iso =
    fixture?.kickoff?.iso ??
    fixture?.provisionalKickoff?.iso;

  if (iso) {
    const date = new Date(iso);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }


  const label =
    fixture?.kickoff?.label ??
    fixture?.provisionalKickoff?.label;

  if (label) {
    const date = new Date(label);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }


  return null;
}


export function getFixtureStatus(fixture) {
  return fixture?.status || null;
}