const API_BASE =
  'https://footballapi.pulselive.com/football';

const headers = {
  Origin: 'https://www.premierleague.com',
  Referer: 'https://www.premierleague.com/',
  account: 'premierleague',

  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',

  Accept: 'application/json',
};

export async function pulseLiveFetch(url) {
  const response = await fetch(url, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');

    throw new Error(
      `PulseLive ${response.status} ${response.statusText}: ${body.slice(
        0,
        300
      )}`
    );
  }

  return response.json();
}

export { API_BASE };