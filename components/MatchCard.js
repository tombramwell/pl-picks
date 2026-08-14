"use client";

import { useState, useEffect } from 'react';

const teamFlags = {
  "Mexico": "🇲🇽", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Czech Republic": "🇨🇿",
  "Canada": "🇨🇦", "Bosnia & Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turkey": "🇹🇷",
  "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Ivory Coast": "🇨🇮", "Ecuador": "🇪🇨",
  "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳",
  "Belgium": "🇧🇪", "Egypt": "🇪🇬", "Iran": "🇮🇷", "New Zealand": "🇳🇿",
  "Spain": "🇪🇸", "Cape Verde": "🇨🇻", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾",
  "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴",
  "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴",
  "Portugal": "🇵🇹", "DR Congo": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Ghana": "🇬🇭", "Panama": "🇵🇦"
};

export default function MatchCard({ match, userId, userPick }) {
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [message, setMessage] = useState('');
  
  const [isInteracting, setIsInteracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  
  const hasExistingPick = !!userPick; 

  const formattedKickoff = new Date(match.kickoffTime).toLocaleString('en-GB', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  useEffect(() => {
    const kickoff = new Date(match.kickoffTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = kickoff - now;

      if (distance <= 0) {
        setIsLocked(true);
        setTimeLeft('Deadline passed');
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setTimeLeft(`Deadline: ${days}d ${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`Deadline: ${hours}h ${minutes}m`);
        }
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 60000); 
    return () => clearInterval(timerId);
  }, [match.kickoffTime]);

  const handleStartPicking = async () => {
    setIsInteracting(true);
    
    if (hasFetched) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/matches/${match._id}/available-players`);
      const data = await res.json();
      setAvailablePlayers(data.availablePlayers || []);
      setHasFetched(true);
    } catch (error) {
      console.error("Failed to fetch players");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePick = async () => {
    if (!selectedPlayer) return;
    
    setMessage('Saving...');
    setShowSuccess(false); 
    
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match._id,
          playerId: selectedPlayer,
          userId: userId 
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(''); 
        setShowSuccess(true); 
        
        setTimeout(() => {
          setShowSuccess(false);
          setIsInteracting(false);
          window.location.reload(); 
        }, 2000);
        
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch (error) {
      setMessage('Network error');
    }
  };

  const flagA = teamFlags[match.teamA] || "🏳️";
  const flagB = teamFlags[match.teamB] || "🏳️";

  return (
    <div className="p-6 mb-4 bg-white rounded-lg shadow-md border border-gray-200">
      
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            {flagA} {match.teamA} vs {match.teamB} {flagB}
          </h3>
          <p className="text-sm font-medium text-gray-500 mt-1">
            📅 {formattedKickoff}
          </p>
        </div>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full whitespace-nowrap ${isLocked ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
          {timeLeft}
        </span>
      </div>

      <hr className="my-4 border-gray-100" />

      {!isLocked ? (
        <div className="flex flex-col space-y-3">
          {!isInteracting ? (
            <>
              {/* --- NEW: DISPLAY EXISTING PICK IF THEY HAVE ONE --- */}
              {hasExistingPick && (
                <div className="p-4 mb-1 rounded-md border bg-gray-50 border-gray-200">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Current selection</p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg text-gray-900">{userPick.playerName}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        {teamFlags[userPick.playerTeam] || "🏳️"} {userPick.playerTeam}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-extrabold bg-yellow-100 text-yellow-800">
                      Pending
                    </div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleStartPicking}
                className="w-full px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded font-semibold hover:bg-blue-100 transition-colors"
              >
               {hasExistingPick ? 'Change pick' : 'Make a pick'}
              </button>
            </>
          ) : isLoading ? (
            <p className="text-gray-500 italic animate-pulse text-center py-2">Loading available players...</p>
          ) : availablePlayers.length === 0 ? (
            <p className="text-red-500 italic text-center">You have used all available players for these teams! 0 points for this match.</p>
          ) : (
            <div className="flex flex-col space-y-3 animate-fade-in">
              <select 
                className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
              >
                <option value="">-- Select a Goal Scorer --</option>
                
                {/* --- NATIVE OPTGROUP FOR HOME TEAM --- */}
                {availablePlayers.filter(p => p.team === match.teamA).length > 0 && (
                  <optgroup label={`——— ${match.teamA.toUpperCase()} ———`}>
                    {availablePlayers
                      .filter(p => p.team === match.teamA)
                      .map(player => {
                        const isInjured = player.squadNumber === 99;
                        const isUsed = player.isUsed;
                        const isDisabled = isInjured || isUsed;
                        
                        let prefix = "";
                        let suffix = "";
                        
                        if (isInjured) {
                          prefix = "[INJ] ";
                          suffix = " (Unavailable)";
                        } else if (isUsed) {
                          prefix = "[USED] ";
                          suffix = " (Already Picked)";
                        }
                        
                        const clubDisplay = player.club || player.team;
                        
                        return (
                          <option 
                            key={player._id} 
                            value={player._id}
                            disabled={isDisabled} 
                            className={isDisabled ? "text-gray-400 bg-gray-50 italic" : ""} 
                          >
                            {prefix}
                            {player.squadNumber && !isInjured ? `${player.squadNumber}. ` : ''}
                            {player.name} ({clubDisplay} • {player.position})
                            {suffix}
                          </option>
                        );
                    })}
                  </optgroup>
                )}

                {/* --- NATIVE OPTGROUP FOR AWAY TEAM --- */}
                {availablePlayers.filter(p => p.team === match.teamB).length > 0 && (
                  <optgroup label={`——— ${match.teamB.toUpperCase()} ———`}>
                    {availablePlayers
                      .filter(p => p.team === match.teamB)
                      .map(player => {
                        const isInjured = player.squadNumber === 99;
                        const isUsed = player.isUsed;
                        const isDisabled = isInjured || isUsed;
                        
                        let prefix = "";
                        let suffix = "";
                        
                        if (isInjured) {
                          prefix = "[INJ] ";
                          suffix = " (Unavailable)";
                        } else if (isUsed) {
                          prefix = "[USED] ";
                          suffix = " (Already Picked)";
                        }
                        
                        const clubDisplay = player.club || player.team;
                        
                        return (
                          <option 
                            key={player._id} 
                            value={player._id}
                            disabled={isDisabled} 
                            className={isDisabled ? "text-gray-400 bg-gray-50 italic" : ""} 
                          >
                            {prefix}
                            {player.squadNumber && !isInjured ? `${player.squadNumber}. ` : ''}
                            {player.name} ({clubDisplay} • {player.position})
                            {suffix}
                          </option>
                        );
                    })}
                  </optgroup>
                )}
              </select>
              
              <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
                <button 
                  onClick={handleSavePick}
                  disabled={!selectedPlayer}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium transition-colors"
                >
                  Save
                </button>

                {/* --- THE ROLL THE DICE BUTTON --- */}
                <button 
                  type="button"
                  onClick={() => {
                    const validOptions = availablePlayers.filter(p => p.squadNumber !== 99 && !p.isUsed);
                    
                    if (validOptions.length > 0) {
                      const randomIndex = Math.floor(Math.random() * validOptions.length);
                      const luckyPlayer = validOptions[randomIndex];
                      
                      setSelectedPlayer(luckyPlayer._id);
                      setMessage(`🎲 Randomly selected: ${luckyPlayer.name}. Save, roll again or choose for yourself!`);
                    } else {
                      setMessage("❌ No available players left to pick from!");
                    }
                  }}
                  className="px-4 py-2 text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 font-medium transition-colors flex items-center justify-center gap-1"
                >
                  Roll the dice 🎲
                </button>

                <button 
                  onClick={() => {
                    setIsInteracting(false);
                    setMessage(''); 
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
              
              {showSuccess && (
                <div className="p-3 mt-2 text-sm text-green-800 bg-green-100 rounded border border-green-200 text-center font-medium animate-fade-in">
                  ✅ Pick successfully updated!
                </div>
              )}
            </div>
          )}
          
          {message && !showSuccess && <p className="text-sm font-medium text-gray-700 text-center mt-2">{message}</p>}
        </div>
      ) : (
        <div className="mt-2 p-4 rounded-md border bg-gray-50 border-gray-200">
          <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Your selection</p>
          
          {userPick ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-gray-900">{userPick.playerName}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  {teamFlags[userPick.playerTeam] || "🏳️"} {userPick.playerTeam}
                </p>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-sm font-extrabold ${
                match.isFinished 
                  ? (userPick.points > 0 ? 'bg-green-200 text-green-900' : 'bg-red-100 text-red-800')
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {match.isFinished ? `${userPick.points > 0 ? '+' : ''}${userPick.points} pts` : 'Pending'}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-gray-500 italic">No pick was made for this match.</p>
              <div className="px-3 py-1 rounded-full text-sm font-extrabold bg-red-100 text-red-800">
                {match.isFinished ? '0 pts' : 'Locked'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}