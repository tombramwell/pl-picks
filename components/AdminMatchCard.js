"use client";

import { useState } from 'react';

// Alphabetical list of all 48 teams to prevent typos
const ALL_TEAMS = [
  "Algeria", "Argentina", "Australia", "Austria", "Belgium", "Bosnia & Herzegovina",
  "Brazil", "Canada", "Cape Verde", "Colombia", "Croatia", "Curaçao", "Czech Republic",
  "DR Congo", "Ecuador", "Egypt", "England", "France", "Germany", "Ghana", "Haiti",
  "Iran", "Iraq", "Ivory Coast", "Japan", "Jordan", "Mexico", "Morocco", "Netherlands",
  "New Zealand", "Norway", "Panama", "Paraguay", "Portugal", "Qatar", "Saudi Arabia",
  "Scotland", "Senegal", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland",
  "Tunisia", "Turkey", "USA", "Uruguay", "Uzbekistan"
];

export default function AdminMatchCard({ match }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickedPlayers, setPickedPlayers] = useState([]);
  const [goals, setGoals] = useState({});
  const [status, setStatus] = useState('');
  
  // Edit Teams State
  const [isEditingTeams, setIsEditingTeams] = useState(false);
  const [editTeamA, setEditTeamA] = useState(match.teamA);
  const [editTeamB, setEditTeamB] = useState(match.teamB);
  const [displayTeamA, setDisplayTeamA] = useState(match.teamA);
  const [displayTeamB, setDisplayTeamB] = useState(match.teamB);

  // --- NEW STATS STATE ---
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const toggleMatch = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && pickedPlayers.length === 0) {
      setStatus('Loading players...');
      const res = await fetch(`/api/admin/matches/${match._id}`);
      const data = await res.json();
      
      setPickedPlayers(data.players || []);
      
      // THE FIX: Pull the saved goals from the database, or default to 0!
      const initialGoals = {};
      data.players?.forEach(p => {
        initialGoals[p._id] = p.savedGoals !== undefined ? p.savedGoals : 0;
      });
      setGoals(initialGoals);
      
      setStatus(data.players?.length === 0 ? 'No players were picked for this match.' : '');
    }
  };

  const handleGoalChange = (playerId, value) => {
    setGoals({ ...goals, [playerId]: value });
  };

  const saveScores = async () => {
    setStatus('Saving scores...');
    const res = await fetch(`/api/admin/matches/${match._id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerGoals: goals })
    });

    if (res.ok) {
      setStatus('Saved! Match is now closed.');
      setTimeout(() => window.location.reload(), 1500); // Quick refresh to clear it out
    } else {
      setStatus('Error saving scores.');
    }
  };

  const saveTeams = async () => {
    setStatus('Updating teams...');
    const res = await fetch(`/api/admin/matches/${match._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamA: editTeamA, teamB: editTeamB })
    });

    if (res.ok) {
      setDisplayTeamA(editTeamA);
      setDisplayTeamB(editTeamB);
      setIsEditingTeams(false);
      setStatus('Teams updated successfully.');
    } else {
      setStatus('Error updating teams.');
    }
  };

  // --- NEW STATS FETCH FUNCTION ---
  const fetchStats = async () => {
    if (showStats) {
      setShowStats(false);
      return;
    }

    setIsLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/matches/${match._id}/stats`);
      const data = await res.json();
      
      // CRITICAL CHECK: Only show stats if the request was successful
      if (res.ok) {
        setStats(data);
        setShowStats(true);
      } else {
        alert(`Could not load stats: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
      alert("Network error while loading stats.");
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="mb-4 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
      <button 
        onClick={toggleMatch}
        className={`w-full p-4 text-left font-bold text-lg flex justify-between items-center transition-colors ${match.isFinished ? 'bg-gray-200 text-gray-600' : 'bg-blue-50 text-blue-900 hover:bg-blue-100'}`}
      >
        <span>{displayTeamA} vs {displayTeamB}</span>
        <span className="text-sm font-normal">{match.isFinished ? '(Finished)' : '(Pending)'}</span>
      </button>

      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-300">
          
          {/* Admin Toggle: Switch between scoring mode and editing mode */}
          {!match.isFinished && (
            <div className="mb-4 flex justify-end">
              <button 
                onClick={() => setIsEditingTeams(!isEditingTeams)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
              >
                {isEditingTeams ? "Cancel Editing" : "Edit Teams (Knockout Stage)"}
              </button>
            </div>
          )}

          {/* EDIT TEAMS UI */}
          {isEditingTeams ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <h4 className="font-bold mb-3 text-yellow-800">Update Placeholder Teams</h4>
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <label className="block text-gray-600 mb-1">Team A</label>
                  <select 
                    value={editTeamA} 
                    onChange={(e) => setEditTeamA(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value={displayTeamA}>{displayTeamA} (Current)</option>
                    {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-gray-600 mb-1">Team B</label>
                  <select 
                    value={editTeamB} 
                    onChange={(e) => setEditTeamB(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value={displayTeamB}>{displayTeamB} (Current)</option>
                    {ALL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={saveTeams} className="bg-yellow-600 text-white px-4 py-2 rounded font-bold hover:bg-yellow-700">
                Save New Teams
              </button>
            </div>
          ) : (
            /* NORMAL SCORING UI */
            <>
              <p className="text-sm text-gray-500 mb-4 font-medium">{status}</p>
              {pickedPlayers.length > 0 && (
                <div className="space-y-3">
                  {pickedPlayers.map(player => (
                    <div key={player._id} className="flex justify-between items-center">
                      <span className="text-gray-800">{player.name} ({player.team})</span>
                      <input 
                        type="number" 
                        min="0"
                        // Add a visual cue so you know it's locked, but leave it editable just in case!
                        className={`w-20 p-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${match.isFinished ? 'bg-gray-100 border-gray-200 text-gray-600' : 'border-gray-300'}`}
                        value={goals[player._id] ?? ''}
                        onChange={(e) => handleGoalChange(player._id, e.target.value)}
                      />
                    </div>
                  ))}
                  
                  {/* Hide the save button if the match is finished to prevent accidental overwrites, 
                      unless you plan on un-closing it in Compass! */}
                  {!match.isFinished && (
                    <div className="pt-4 mt-2 border-t border-gray-200">
                      <button 
                        onClick={saveScores}
                        className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors"
                      >
                        Confirm Final Scores & Close Match
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* --- NEW STATS SECTION --- */}
          <hr className="my-6 border-gray-200" />
          
          <div>
            <button 
              onClick={fetchStats}
              className="text-sm font-bold text-purple-600 hover:text-purple-800 flex items-center transition-colors"
            >
              {showStats ? '▼ Hide Pick Stats' : '▶ View Pick Stats (Who picked who?)'}
            </button>

            {isLoadingStats && (
              <p className="text-sm text-gray-500 mt-3 animate-pulse">Loading player stats...</p>
            )}

            {showStats && stats && (
              <div className="mt-4 p-4 bg-purple-50 rounded-md border border-purple-100">
                <p className="text-sm font-extrabold text-purple-900 mb-3 border-b border-purple-200 pb-2">
                  Total Picks Made: {stats.totalPicks}
                </p>
                
                {stats.stats.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">Nobody has made a pick for this match yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.stats.map(stat => (
                      <li key={stat.id} className="flex justify-between items-center text-sm bg-white p-2 rounded shadow-sm border border-purple-50">
                        <span className="font-semibold text-gray-800">
                          {stat.name} <span className="text-gray-500 font-normal text-xs ml-1">({stat.team})</span>
                        </span>
                        <span className="px-2 py-1 bg-purple-200 text-purple-900 font-bold rounded-full text-xs">
                          {stat.count} {stat.count === 1 ? 'pick' : 'picks'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}