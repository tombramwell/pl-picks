'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPlayerManager() {
  const [players, setPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch players on load
  useEffect(() => {
    fetch('/api/admin/players')
      .then(res => res.json())
      .then(data => {
        if (data.players) setPlayers(data.players);
        setLoading(false);
      });
  }, []);

  const handleHidePlayer = async (playerId, playerName) => {
    if (!confirm(`Are you sure you want to hide ${playerName}? They will instantly disappear from user dropdowns.`)) return;

    try {
      const res = await fetch('/api/admin/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });

      if (res.ok) {
        // Instantly remove them from the screen so you know it worked
        setPlayers(players.filter(p => p._id !== playerId));
      } else {
        alert('Failed to hide player.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter the list based on the search bar (searches name or team)
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="max-w-4xl mx-auto p-4 md:p-8 min-h-screen">
      
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-800 to-black text-white p-6 border-b-4 border-red-600 mb-8 shadow-md flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Force <span className="text-red-500">Hide</span>
          </h1>
          <span className="text-xs text-gray-300 font-bold tracking-widest uppercase block mt-1">
            Manual Player Removal Tool
          </span>
        </div>
        <Link href="/admin" className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-white transition bg-white/10 px-4 py-2 border border-white/20">
          ◀ DASHBOARD
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="Search by player name or team..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 border-2 border-gray-300 font-bold text-barclays-dark uppercase focus:border-red-500 outline-none shadow-sm"
        />
      </div>

      {/* Player List */}
      <div className="bg-white border-2 border-gray-300 shadow-sm">
        {loading ? (
          <div className="p-8 text-center font-bold text-gray-400 uppercase tracking-widest">Loading squad data...</div>
        ) : (
          <div className="divide-y-2 divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredPlayers.map(player => (
              <div key={player._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
                <div>
                  <div className="font-black uppercase text-barclays-dark">{player.name}</div>
                  <div className="text-xs font-bold uppercase text-gray-500 tracking-widest">{player.team} • {player.position}</div>
                </div>
                
                <button 
                  onClick={() => handleHidePlayer(player._id, player.name)}
                  className="bg-red-600 text-white font-black uppercase text-xs tracking-widest px-4 py-2 hover:bg-red-800 transition shadow-sm border border-red-700"
                >
                  🚫 HIDE
                </button>
              </div>
            ))}
            
            {filteredPlayers.length === 0 && (
              <div className="p-8 text-center font-bold text-gray-400 uppercase tracking-widest">No players found</div>
            )}
          </div>
        )}
      </div>

    </main>
  );
}