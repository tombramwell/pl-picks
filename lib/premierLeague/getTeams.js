import { API_BASE, pulseLiveFetch } from './pulseLive';

const COMPETITION_ID = 1;

export async function getSeasonTeams(seasonId) {
  const params = new URLSearchParams({
    comps: String(COMPETITION_ID),
    compSeasons: String(seasonId),
    page: '0',
    pageSize: '100',
    altIds: 'true',
  });

  const url =
    `${API_BASE}/teams?${params.toString()}`;

  const data = await pulseLiveFetch(url);

  if (!Array.isArray(data.content)) {
    throw new Error(
      'Invalid response from Premier League teams endpoint'
    );
  }

  const teams = data.content
    .map((team) => {
      const club = team.club || team;

      return {
        id: Number(club.id),

        name:
          club.name ||
          club.shortName ||
          team.name ||
          team.shortName ||
          null,
      };
    })
    .filter(
      (team) =>
        Number.isInteger(team.id) &&
        team.name
    );

  if (teams.length === 0) {
    throw new Error(
      'PulseLive returned zero Premier League clubs'
    );
  }

  return teams;
}