export function getPosition(player) {
  switch (player?.info?.position) {
    case 'G':
      return 'Goalkeeper';

    case 'D':
      return 'Defender';

    case 'M':
      return 'Midfielder';

    case 'F':
      return 'Forward';

    default:
      return 'Unknown';
  }
}

export function getPlayerId(player) {
  return player?.id ?? player?.playerId ?? null;
}

export function getPlayerName(player) {
  return (
    player?.name?.display ||
    player?.name?.first ||
    player?.name?.last ||
    player?.name ||
    'Unknown'
  );
}

export function getSquadNumber(player) {
  return (
    player?.info?.shirtNum ??
    player?.shirtNum ??
    99
  );
}