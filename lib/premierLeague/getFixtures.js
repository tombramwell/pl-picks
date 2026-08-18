import { API_BASE, pulseLiveFetch } from './pulseLive';

export async function getSeasonFixtures(seasonId) {
  const params = new URLSearchParams({
    comps: '1',
    compSeasons: String(seasonId),
    page: '0',
    pageSize: '500',
    sort: 'asc',
    altIds: 'true',
  });

  const url = `${API_BASE}/fixtures?${params.toString()}`;

  console.log(
    `Fetching Premier League fixtures: ${url}`
  );

  const data = await pulseLiveFetch(url);

  if (!data) {
    throw new Error(
      'PulseLive returned no fixture data'
    );
  }

  if (!Array.isArray(data.content)) {
    console.error(
      'Unexpected fixture response:',
      JSON.stringify(data).slice(0, 2000)
    );

    throw new Error(
      'PulseLive fixture response does not contain a content array'
    );
  }

  if (data.content.length === 0) {
    throw new Error(
      'PulseLive returned zero fixtures'
    );
  }

  console.log(
    `PulseLive returned ${data.content.length} fixtures`
  );

  return data.content;
}