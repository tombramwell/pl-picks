export function getFixtureId(fixture) {
  return fixture?.id
    ? String(fixture.id)
    : null;
}

export function getGameweek(fixture) {
  return fixture?.gameweek?.gameweek ?? null;
}

export function getTeams(fixture) {
  if (
    !Array.isArray(fixture?.teams) ||
    fixture.teams.length < 2
  ) {
    return null;
  }

  const teamA =
    fixture.teams[0]?.team?.name;

  const teamB =
    fixture.teams[1]?.team?.name;

  if (!teamA || !teamB) {
    return null;
  }

  return {
    teamA,
    teamB,
  };
}

export function getKickoffTime(fixture) {
  const millis =
    fixture?.kickoff?.millis;

  if (!millis) {
    return null;
  }

  const date = new Date(
    Number(millis)
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}