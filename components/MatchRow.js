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

    // Update time every minute
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync state with server props
  useEffect(() => {
    setSelectedPlayerId(currentPick?.playerId || '');
    setSavedPick(currentPick);
  }, [currentPick]);

  // Kickoff calculation
  const kickoffTime = new Date(match.kickoffTime);
  const currentTime = now || new Date(match.kickoffTime); // Fallback during SSR
  const diffMs = kickoffTime - currentTime;
  const isLocked = mounted && diffMs <= 0;
  
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const showCountdown = mounted && diffMs > 0 && diffMs <= sevenDaysMs;

  // Format countdown string
  let countdownString = "";
  if (showCountdown) {
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) countdownString += `${days}d `;
    if (hours > 0) countdownString += `${hours}h `;
    countdownString += `${minutes}m`;
  }

  // Sort players by squad number
  const sortedTeamA = [...teamAPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const sortedTeamB = [...teamBPlayers].sort((a, b) => (a.squadNumber || 99) - (b.squadNumber || 99));
  const allMatchPlayers = [...sortedTeamA, ...sortedTeamB];

  const isDirty = selectedPlayerId !== (savedPick?.playerId || '');

  // Save Pick Handler
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

  // Roll the Dice Handler
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
    
    setSelectedPlayerId(randomPlayer._id);
  };

  // return (
  //   <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
  //     {/* Header */}
  //     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
  //       <div className="text-sm font-semibold text-gray-700">
  //         <span className="text-indigo-900 font-extrabold">{match.teamA}</span>
  //         <span className="text-gray-400 mx-2">vs</span>
  //         <span className="text-indigo-900 font-extrabold">{match.teamB}</span>
          
  //         {/* Direct suppressHydrationWarning placed on the date string itself */}
  //         <span 
  //           suppressHydrationWarning 
  //           className="text-xs text-gray-500 font-normal block sm:inline sm:ml-3"
  //         >
  //           {kickoffTime.toLocaleString('en-GB', {
  //             weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  //           })}
  //         </span>
  //       </div>

  //       <div className="flex items-center space-x-2">
  //         {!isLocked && (
  //           <button
  //             onClick={handleRollDice}
  //             disabled={loading}
  //             title="Pick a random available goalscorer"
  //             className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1 disabled:opacity-50"
  //           >
  //             🎲 Roll the Dice
  //           </button>
  //         )}

  //         {/* Dynamic Badge */}
  //         <div>
  //           {!mounted ? (
  //             <span className="text-xs font-bold uppercase bg-gray-100 text-gray-500 px-2 py-1.5 rounded">
  //               Open
  //             </span>
  //           ) : isLocked ? (
  //             <span className="text-xs font-bold uppercase bg-red-100 text-red-700 px-2 py-1.5 rounded">
  //               Locked
  //             </span>
  //           ) : showCountdown ? (
  //             <span className="text-xs font-bold uppercase bg-amber-100 text-amber-800 px-2 py-1.5 rounded whitespace-nowrap">
  //               Deadline: {countdownString.trim()}
  //             </span>
  //           ) : (
  //             <span className="text-xs font-bold uppercase bg-green-100 text-green-700 px-2 py-1.5 rounded">
  //               Open
  //             </span>
  //           )}
  //         </div>
  //       </div>
  //     </div>

  //     {/* Selector + Save Button */}
  //     <div className="flex flex-col sm:flex-row gap-2">
  //       <select
  //         disabled={isLocked || loading}
  //         value={selectedPlayerId}
  //         onChange={(e) => setSelectedPlayerId(e.target.value)}
  //         className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
  //       >
  //         <option value="">-- Make a selection --</option>
          
  //         <optgroup label={`--- ${match.teamA} ---`}>
  //           {sortedTeamA.map(p => {
  //             const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
  //             return (
  //               <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
  //                 {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '' : ''}
  //               </option>
  //             );
  //           })}
  //         </optgroup>

  //         <optgroup label={`--- ${match.teamB} ---`}>
  //           {sortedTeamB.map(p => {
  //             const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
  //             return (
  //               <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
  //                 {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '' : ''}
  //               </option>
  //             );
  //           })}
  //         </optgroup>
  //       </select>

  //       {!isLocked && (
  //         <button
  //           onClick={handleSavePick}
  //           disabled={!isDirty || loading || !selectedPlayerId}
  //           className={`px-5 py-2.5 rounded-lg font-bold text-sm transition shrink-0 ${
  //             isDirty && selectedPlayerId && !loading
  //               ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
  //               : 'bg-gray-200 text-gray-400 cursor-not-allowed'
  //           }`}
  //         >
  //           {loading ? 'Saving...' : 'Save Pick'}
  //         </button>
  //       )}
  //     </div>

  //     {/* Saved Pick Footer */}
  //     {savedPick && (
  //       <div className="text-xs text-indigo-700 bg-indigo-50 p-2.5 rounded-lg flex justify-between items-center border border-indigo-100 mt-2">
  //         <span>
  //           Saved selection: <strong className="ml-1">{savedPick.playerName}</strong> ({savedPick.playerTeam})
  //         </span>
  //         {savedPick.goalsScored > 0 && (
  //           <span className="font-extrabold text-green-700 bg-green-100 px-2 py-0.5 rounded shadow-sm">
  //             +{savedPick.goalsScored} ⚽
  //           </span>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );
  return (
    <div className="bg-white border-2 border-gray-300 shadow-sm relative">
      {/* Cyan Accent Top Bar */}
      <div className="h-1 w-full bg-barclays-cyan"></div>

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-200 pb-3">
          <div className="text-sm font-bold uppercase tracking-wide text-barclays-dark">
            <span className="text-base">{match.teamA}</span>
            <span className="text-barclays-cyan mx-2">v</span>
            <span className="text-base">{match.teamB}</span>
            
<span suppressHydrationWarning className="text-xs text-gray-500 font-bold block sm:inline sm:ml-4 bg-gray-100 px-2 py-1">
              {kickoffTime.toLocaleString('en-GB', {
                weekday: 'short', 
                day: 'numeric', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'Europe/London' // <--- Forces UK Time (accounts for BST automatically)
              })}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {!isLocked && (
              <button
                onClick={handleRollDice}
                disabled={loading}
                className="text-xs bg-gray-800 text-white font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-black transition disabled:opacity-50"
              >
                Auto Pick
              </button>
            )}

            {/* Dynamic Status Badge */}
            <div>
              {!mounted ? (
                <span className="text-xs font-black uppercase tracking-wider bg-gray-200 text-gray-500 px-2 py-1.5">OPEN</span>
              ) : isLocked ? (
                <span className="text-xs font-black uppercase tracking-wider bg-red-600 text-white px-2 py-1.5">LOCKED</span>
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
                return (
                  <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                    {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '[USED]' : ''}
                  </option>
                );
              })}
            </optgroup>

            <optgroup label={`--- ${match.teamB} ---`}>
              {sortedTeamB.map(p => {
                const isUsedElsewhere = usedPlayerIds.includes(p._id) && p._id !== savedPick?.playerId;
                return (
                  <option key={p._id} value={p._id} disabled={isUsedElsewhere}>
                    {p.squadNumber || '?'}. {p.name} ({p.position}) {isUsedElsewhere ? '[USED]' : ''}
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
          <div className="text-xs font-bold uppercase tracking-wide text-barclays-dark bg-gray-100 p-3 flex justify-between items-center border-l-4 border-barclays-blue mt-2">
            <span>
              PICK: <span className="text-barclays-blue font-black ml-1 text-sm">{savedPick.playerName}</span> <span className="text-gray-500">({savedPick.playerTeam})</span>
            </span>
            {savedPick.goalsScored > 0 && (
              <span className="font-black text-white bg-barclays-blue px-3 py-1 border border-barclays-cyan">
                {savedPick.goalsScored} GOALS / {savedPick.points} PTS
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}