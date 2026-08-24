'use client';
import { useState, useEffect } from 'react';

export default function MatchRow({ match, currentPick, teamAPlayers, teamBPlayers, usedPlayerIds, userId }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(currentPick?.playerId || '');
  const [loading, setLoading] = useState(false);
  const [savedPick, setSavedPick] = useState(currentPick);
  
  // Mounted state prevents client/server hydration mismatches
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedPlayerId(currentPick?.playerId || '');
    setSavedPick(currentPick);
  }, [currentPick]);

  // Kickoff calculation
  const kickoffTime = new Date(match.kickoffTime);
  const currentTime = now || new Date(match.kickoffTime); 
  const diffMs = kickoffTime - currentTime;
  const isLocked = mounted && diffMs <= 0;
  
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const showCountdown = mounted && diffMs > 0 && diffMs <= sevenDaysMs;

  let countdownString = "";
  if (showCountdown) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) countdownString += `${days}d `;
    if (hours > 0) countdownString += `${hours}h `;
    countdownString += `${minutes}m`;
  }

// LINE-UPS LOGIC
  const lineupA = match.teamALineup || [];
  const lineupB = match.teamBLineup || [];
  const benchA = match.teamABench || [];  // NEW
  const benchB = match.teamBBench || [];  // NEW
  const lineupsAnnounced = lineupA.length > 0 || lineupB.length > 0;

  const sortedTeamA = [...teamAPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const sortedTeamB = [...teamBPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const allMatchPlayers = [...sortedTeamA, ...sortedTeamB];

  const isDirty = selectedPlayerId !== (savedPick?.playerId || '');

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

  const handleRollDice = () => {
    if (isLocked || loading) return;

    // Filter available players
    // If lineups are out, strictly prefer players who are starting!
    let availablePlayers = allMatchPlayers.filter(
      p => !usedPlayerIds.includes(p._id) || p._id === savedPick?.playerId
    );

    if (lineupsAnnounced) {
      const startingAvailablePlayers = availablePlayers.filter(p => lineupA.includes(p._id) || lineupB.includes(p._id));
      if (startingAvailablePlayers.length > 0) {
        availablePlayers = startingAvailablePlayers;
      }
    }

    if (availablePlayers.length === 0) {
      alert('No available players left for this match!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    setSelectedPlayerId(availablePlayers[randomIndex]._id);
  };

  return (
    <div className={`bg-white border-2 shadow-sm relative transition-colors ${match.isFinished ? 'border-gray-300 opacity-95' : isLocked ? 'border-barclays-cyan' : 'border-gray-300'}`}>
      <div className={`h-1 w-full ${match.isFinished ? 'bg-gray-400' : 'bg-barclays-cyan'}`}></div>

      <div className="p-4 space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-2 border-b border-gray-200 pb-3">
          
          <div className="flex-1 w-full">
            <div className="text-sm font-bold uppercase tracking-wide text-barclays-dark flex items-center flex-wrap gap-y-2">
              <span className="text-base">{match.teamA}</span>
              
              {(isLocked || match.isFinished) && match.scoreTeamA != null ? (
                <span className={`px-3 py-1 mx-3 font-black text-lg border shadow-sm ${match.isFinished ? 'bg-gray-800 text-white border-gray-900' : 'bg-barclays-dark text-white border-barclays-cyan'}`}>
                  {match.scoreTeamA} - {match.scoreTeamB}
                </span>
              ) : (
                <span className="text-barclays-cyan mx-2">v</span>
              )}

              <span className="text-base">{match.teamB}</span>
              
              <span suppressHydrationWarning className="text-xs text-gray-500 font-bold block sm:inline sm:ml-4 bg-gray-100 px-2 py-1 mt-1 sm:mt-0">
                {kickoffTime.toLocaleString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', 
                  hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' 
                })}
              </span>
            </div>

            {/* Real-Life Goalscorers List */}
            {match.playerGoals && Object.keys(match.playerGoals).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {Object.entries(match.playerGoals)
                  .filter(([_, goals]) => goals > 0)
                  .map(([playerId, goals]) => {
                    const scorer = allMatchPlayers.find(p => p._id === playerId);
                    if (!scorer) return null;
                    return (
                      <span key={playerId} className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 border border-gray-200">
                        {scorer.name} {goals > 1 ? `(${goals})` : ''} ⚽
                      </span>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 mt-2 sm:mt-0 shrink-0">
            {/* NEW: Line-ups Out Badge */}
            {lineupsAnnounced && !isLocked && !match.isFinished && (
              <span className="text-xs font-black uppercase tracking-wider bg-barclays-cyan text-barclays-dark px-2 py-1.5 shadow-sm border border-[#00d0e6] animate-pulse">
                📋 TEAMSHEETS OUT
              </span>
            )}

            {!isLocked && (
              <button
                onClick={handleRollDice}
                disabled={loading}
                className="text-xs bg-gray-800 text-white font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-black transition disabled:opacity-50"
              >
                Auto Pick
              </button>
            )}

            <div>
              {!mounted ? (
                <span className="text-xs font-black uppercase tracking-wider bg-gray-200 text-gray-500 px-2 py-1.5">OPEN</span>
              ) : match.isFinished ? (
                <span className="text-xs font-black uppercase tracking-wider bg-gray-800 text-white px-2 py-1.5">FULL TIME</span>
              ) : isLocked ? (
                <span className="text-xs font-black uppercase tracking-wider bg-red-600 text-white px-2 py-1.5 inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span> IN PLAY
                </span>
              ) : showCountdown ? (
                <span className="text-xs font-black uppercase tracking-wider bg-yellow-400 text-black px-2 py-1.5">
                  CLOSES {countdownString.trim()}
                </span>
              ) : (
                <span className="text-xs font-black uppercase tracking-wider bg-green-600 text-white px-2 py-1.5">OPEN</span>
              )}
            </div>
          </div>
        </div>

        {/* Selector + Save Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            disabled={isLocked || loading}
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="flex-1 p-2 border-2 border-gray-300 text-sm font-bold text-barclays-dark bg-gray-50 focus:bg-white focus:border-barclays-cyan outline-none disabled:bg-gray-200 disabled:text-gray-400 uppercase"
          >
            <option value="">-- SELECT SCORER --</option>
            
            <optgroup label={`--- ${match.teamA} ---`}>
              {sortedTeamA.map(p => {
                const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
                
let lineupStatus = '';
                if (lineupA.length > 0) {
                  if (lineupA.includes(p._id)) lineupStatus = '✅ ';
                  else if (benchA.includes(p._id)) lineupStatus = '🪑 ';
                  else lineupStatus = '❌ ';
                }

                return (
                  <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                    {lineupStatus}{p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '[USED]' : ''}
                  </option>
                );
              })}
            </optgroup>
            
            <optgroup label={`--- ${match.teamB} ---`}>
              {sortedTeamB.map(p => {
                const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
                
let lineupStatus = '';
                if (lineupA.length > 0) {
                  if (lineupA.includes(p._id)) lineupStatus = '✅ ';
                  else if (benchA.includes(p._id)) lineupStatus = '🪑 ';
                  else lineupStatus = '❌ ';
                }

                return (
                  <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                    {lineupStatus}{p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '[USED]' : ''}
                  </option>
                );
              })}
            </optgroup>
          </select>

          {!isLocked && (
            <button
              onClick={handleSavePick}
              disabled={!isDirty || loading || !selectedPlayerId}
              className={`px-6 py-2 font-black text-sm uppercase tracking-wider transition shrink-0 ${
                isDirty && selectedPlayerId && !loading
                  ? 'bg-gradient-to-b from-barclays-blue to-barclays-dark text-white border-b-2 border-barclays-cyan hover:from-barclays-dark hover:to-black'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'SAVING...' : 'CONFIRM'}
            </button>
          )}
        </div>

        {/* Saved Pick Footer */}
        {savedPick && (
          <div className={`text-xs font-bold uppercase tracking-wide p-3 flex justify-between items-center border-l-4 mt-2 ${
            savedPick.goalsScored > 0 
              ? 'bg-[#e6f4ff] text-barclays-dark border-barclays-blue shadow-sm'
              : match.isFinished 
                ? 'bg-gray-100 text-gray-500 border-gray-400' 
                : 'bg-gray-100 text-barclays-dark border-barclays-blue'
          }`}>
            <span>
              PICK: <span className={`${savedPick.goalsScored > 0 ? 'text-barclays-blue' : match.isFinished ? 'text-gray-700' : 'text-barclays-blue'} font-black ml-1 text-sm`}>
                {savedPick.playerName}
              </span> 
              <span className="text-gray-500 ml-1">({savedPick.playerTeam})</span>
            </span>
            
            {savedPick.goalsScored > 0 && (
              <span className="font-black text-white bg-green-600 px-3 py-1 border border-green-700 shadow-sm">
                {savedPick.goalsScored} GOALS / {savedPick.points} PTS
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}