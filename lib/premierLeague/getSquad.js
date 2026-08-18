import { API_BASE, pulseLiveFetch } from './pulseLive';

export async function getTeamSquad(
  teamId,
  seasonId
) {
  const params = new URLSearchParams({
    altIds: 'true',
    compCodeForActivePlayer: 'EN_PR',
  });

  const url =
    `${API_BASE}/teams/${teamId}/compseasons/${seasonId}/staff?` +
    params.toString();

  const data = await pulseLiveFetch(url);

  /*
   * Defensive validation.
   *
   * An empty/invalid response must NOT be interpreted
   * as "this club has no players".
   */
  if (!data || !Array.isArray(data.players)) {
    throw new Error(
      `Invalid squad response for team ${teamId}`
    );
  }

  if (data.players.length === 0) {
    throw new Error(
      `Empty squad returned for team ${teamId}`
    );
  }

  return data.players;
}