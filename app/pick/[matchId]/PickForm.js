'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PickForm({ match, players, usedPlayerIds = [] }) {  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group players by their team so we can make nice dropdown optgroups
  const teamAPlayers = players.filter(p => p.team === match.teamA);
  const teamBPlayers = players.filter(p => p.team === match.teamB);

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlayer) return alert("Please select a player!");
    
    setIsSubmitting(true);

    // TODO: Replace with the actual logged-in user's ID from NextAuth later!
    const dummyUserId = "64a1b2c3d4e5f6a7b8c9d0e1"; 

    try {
      const response = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match._id,
          playerId: selectedPlayer,
          userId: dummyUserId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // This will pop up if they violate the GW19 rule or the match has started!
        alert(data.error); 
        setIsSubmitting(false);
      } else {
        alert("Pick locked in successfully!");
        // Redirect them back to the dashboard for that Gameweek
        router.push(`/?gw=${match.gameweek}`); 
        router.refresh(); // Forces Next.js to pull the latest data
      }
    } catch (error) {
      alert("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Choose your Goalscorer
      </h3>
      
      <div className="mb-6">
        <select 
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
        >
          <option value="" disabled>-- Select a Player --</option>
          
<optgroup label={match.teamA}>
            {teamAPlayers.map(p => {
              const isUsed = usedPlayerIds.includes(p._id.toString());
              return (
                <option key={p._id} value={p._id} disabled={isUsed}>
                  {p.squadNumber} - {p.name} ({p.position}) {isUsed ? '' : ''}
                </option>
              );
            })}
          </optgroup>
          
          <optgroup label={match.teamB}>
            {teamBPlayers.map(p => {
              const isUsed = usedPlayerIds.includes(p._id.toString());
              return (
                <option key={p._id} value={p._id} disabled={isUsed}>
                  {p.squadNumber} - {p.name} ({p.position}) {isUsed ? '' : ''}
                </option>
              );
            })}
          </optgroup>
          
        </select>
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting || !selectedPlayer}
        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {isSubmitting ? 'Saving...' : 'Lock in Pick'}
      </button>
    </form>
  );
}