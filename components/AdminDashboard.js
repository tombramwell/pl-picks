'use client';
import { useState } from 'react';

export default function AdminDashboard({ matches, players }) {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [isFinished, setIsFinished] = useState(false);
  const [scoreTeamA, setScoreTeamA] = useState(0);
  const [scoreTeamB, setScoreTeamB] = useState(0);
  const [playerGoals, setPlayerGoals] = useState({});

  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setIsFinished(match.isFinished || false);
    setScoreTeamA(match.scoreTeamA || 0);
    setScoreTeamB(match.scoreTeamB || 0);
    setPlayerGoals({});
  };

  const handleGoalChange = (playerId, goals) => {
    setPlayerGoals(prev => ({
      ...prev,
      [playerId]: parseInt(goals) || 0
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: selectedMatch._id,
          isFinished,
          scoreTeamA,
          scoreTeamB,
          playerGoals
        })
      });
      
      if (res.ok) {
        alert('Match & Leaderboard updated successfully!');
        window.location.reload();
      } else {
        alert('Failed to update.');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // 1. MATCH LIST VIEW
  if (!selectedMatch) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map(m => (
          <button 
            key={m._id} 
            onClick={() => handleSelectMatch(m)}
            className={`p-4 rounded-xl border text-left hover:bg-gray-50 transition ${m.isFinished ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
          >
            <div className="text-xs text-gray-500 mb-1">GW {m.gameweek}</div>
            <div className="font-bold">{m.teamA} vs {m.teamB}</div>
            <div className="text-xs mt-2">{m.isFinished ? `Final: ${m.scoreTeamA} - ${m.scoreTeamB}` : 'Pending Result'}</div>
          </button>
        ))}
      </div>
    );
  }

  // 2. MATCH DETAIL VIEW (Update Scores & Goals)
  const teamAPlayers = players.filter(p => p.team === selectedMatch.teamA);
  const teamBPlayers = players.filter(p => p.team === selectedMatch.teamB);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <button onClick={() => setSelectedMatch(null)} className="text-sm text-indigo-600 mb-4 hover:underline">
        ◀ Back to Matches
      </button>
      
      <h2 className="text-2xl font-bold mb-6">{selectedMatch.teamA} vs {selectedMatch.teamB}</h2>

      {/* Score & Status */}
      <div className="flex gap-4 items-end mb-8 bg-gray-50 p-4 rounded-lg">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{selectedMatch.teamA} Score</label>
          <input type="number" min="0" value={scoreTeamA} onChange={e => setScoreTeamA(e.target.value)} className="w-20 p-2 border rounded" />
        </div>
        <div className="pb-2 font-bold text-gray-400">-</div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{selectedMatch.teamB} Score</label>
          <input type="number" min="0" value={scoreTeamB} onChange={e => setScoreTeamB(e.target.value)} className="w-20 p-2 border rounded" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input type="checkbox" id="finished" checked={isFinished} onChange={e => setIsFinished(e.target.checked)} className="w-5 h-5" />
          <label htmlFor="finished" className="font-bold text-gray-800">Match Finished?</label>
        </div>
      </div>

      {/* Goalscorer Assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold text-lg mb-3 border-b pb-2">{selectedMatch.teamA} Goalscorers</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {teamAPlayers.map(p => (
              <div key={p._id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span>{p.name}</span>
                <input type="number" min="0" placeholder="0" onChange={e => handleGoalChange(p._id, e.target.value)} className="w-16 p-1 border rounded text-center" />
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="font-bold text-lg mb-3 border-b pb-2">{selectedMatch.teamB} Goalscorers</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {teamBPlayers.map(p => (
              <div key={p._id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span>{p.name}</span>
                <input type="number" min="0" placeholder="0" onChange={e => handleGoalChange(p._id, e.target.value)} className="w-16 p-1 border rounded text-center" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="w-full bg-indigo-900 text-white font-bold py-4 rounded-xl hover:bg-indigo-800 transition">
        {loading ? 'Processing...' : 'Save Results & Update Leaderboard'}
      </button>
    </div>
  );
}