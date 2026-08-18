import { API_BASE, pulseLiveFetch } from './pulseLive';

const COMPETITION_ID = 1;

export async function getCurrentSeason() {
  const params = new URLSearchParams({
    page: '0',
    pageSize: '100',
  });

  const url =
    `${API_BASE}/competitions/${COMPETITION_ID}/compseasons?` +
    params.toString();

  const data = await pulseLiveFetch(url);

  if (!Array.isArray(data.content)) {
    throw new Error(
      'Invalid response from Premier League compseasons endpoint'
    );
  }

  /*
   * Prefer a season explicitly marked current.
   */
  const current =
    data.content.find(
      (season) =>
        season.active === true ||
        season.current === true
    ) ||
    data.content.find(
      (season) => season.label === '2026/27'
    ) ||
    data.content[0];

  if (!current) {
    throw new Error(
      'Could not determine current Premier League season'
    );
  }

  return {
    id: Number(current.id),
    label: current.label,
  };
}