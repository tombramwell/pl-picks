'use client';
import { useState, useEffect } from 'react';

export default function MatchRow({ match, currentPick, teamAPlayers, teamBPlayers, usedPlayerIds, userId }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(currentPick?.playerId || '');
  const [loading, setLoading] = useState(false);
  const [savedPick, setSavedPick] = useState(currentPick);

  // Keep state synced if props update from server
  useEffect(() => {
    setSelectedPlayerId(currentPick?.playerId || '');
    setSavedPick(currentPick);
  }, [currentPick]);

  // Check if kickoff has passed
  const isLocked = new Date() >= new Date(match.kickoffTime);

  // Sort players by squad number
  const sortedTeamA = [...teamAPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const sortedTeamB = [...teamBPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const allMatchPlayers = [...sortedTeamA, ...sortedTeamB];

  // Has the user changed their selection from what is currently saved in DB?
  const isDirty = selectedPlayerId !== (savedPick?.playerId || '');

  // Handle manual explicit save
  const handleSavePick = async () => {
    if (isLocked || !selectedPlayerId || !isDirty) return;
    
    setLoading(true);
    const playerObj = allMatchPlayers.find(p => p._id === selectedPlayerId);

    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match._id,
          playerId: selectedPlayerId,
          playerName: playerObj?.name,
          playerTeam: playerObj?.team,
          gameweek: match.gameweek
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSavedPick(data.pick);
      } else {
        alert('Failed to save pick or deadline has passed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Roll the Dice: Randomly pick an available player without auto-saving immediately
  const handleRollDice = () => {
    if (isLocked || loading) return;

    const availablePlayers = allMatchPlayers.filter(
      p => !usedPlayerIds.includes(p._id) || p._id === savedPick?.playerId
    );

    if (availablePlayers.length === 0) {
      alert('No available players left for this match!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const randomPlayer = availablePlayers[randomIndex];
    
    // Just updates the dropdown state - user clicks 'Save Pick' to finalize
    setSelectedPlayerId(randomPlayer._id);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
      {/* Header: Date, Kickoff Status, & Dice Roll */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div suppressHydrationWarning className="text-sm font-semibold text-gray-700">
          <span className="text-indigo-900 font-extrabold">{match.teamA}</span>
          <span className="text-gray-400 mx-2">vs</span>
          <span className="text-indigo-900 font-extrabold">{match.teamB}</span>
          <span className="text-xs text-gray-500 font-normal block sm:inline sm:ml-3">
            {new Date(match.kickoffTime).toLocaleString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {!isLocked && (
            <button
              onClick={handleRollDice}
              disabled={loading}
              title="Pick a random available goalscorer"
              className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-lg hover:bg-amber-200 transition flex items-center gap-1 disabled:opacity-50"
            >
              🎲 Roll the Dice...
            </button>
          )}

          {isLocked ? (
            <span className="text-xs font-bold uppercase bg-red-100 text-red-700 px-2 py-1 rounded">
              Locked
            </span>
          ) : (
            <span className="text-xs font-bold uppercase bg-green-100 text-green-700 px-2 py-1 rounded">
              Open
            </span>
          )}
        </div>
      </div>

      {/* Selector + Save Button Container */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          disabled={isLocked || loading}
          value={selectedPlayerId}
          onChange={(e) => setSelectedPlayerId(e.target.value)}
          className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">-- Make a selection --</option>
          
          <optgroup label={`--- ${match.teamA} ---`}>
            {sortedTeamA.map(p => {
              const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
              return (
                <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                  {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '' : ''}
                </option>
              );
            })}
          </optgroup>

          <optgroup label={`--- ${match.teamB} ---`}>
            {sortedTeamB.map(p => {
              const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
              return (
                <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                  {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '' : ''}
                </option>
              );
            })}
          </optgroup>
        </select>

        {/* Save Button */}
        {!isLocked && (
          <button
            onClick={handleSavePick}
            disabled={!isDirty || loading || !selectedPlayerId}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition shrink-0 ${
              isDirty && selectedPlayerId && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? 'Saving...' : 'Save Pick'}
          </button>
        )}
      </div>

      {/* Saved Pick Status Footer */}
      {savedPick && (
        <div className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg flex justify-between items-center">
          <span>
            Saved Selection: <strong>{savedPick.playerName}</strong> ({savedPick.playerTeam})
          </span>
          {savedPick.goalsScored > 0 && (
            <span className="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
              +{savedPick.goalsScored} ⚽
            </span>
          )}
        </div>
      )}
    </div>
  );
}