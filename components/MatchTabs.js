"use client";

import { useState } from 'react';
import MatchCard from './MatchCard';

export default function MatchTabs({ matches, userPicks, userId }) {
  const [activeTab, setActiveTab] = useState('action');

  const now = new Date().getTime();

  // 1. Set up our three buckets
  const actionMatches = [];
  const lockedMatches = [];
  const finishedMatches = [];

  // 2. Sort the matches into the buckets based on their status and the user's picks
  matches.forEach(match => {
    const hasPicked = userPicks.some(p => p.matchId === match._id);
    const hasStarted = new Date(match.kickoffTime).getTime() <= now;

    if (match.isFinished) {
      finishedMatches.push(match);
    } else if (hasPicked || hasStarted) {
      lockedMatches.push(match);
    } else {
      actionMatches.push(match);
    }
  });

  // --- THE NEW ADDITION ---
  // Sort only the finished matches so the most recently played games appear at the very top
  finishedMatches.sort((a, b) => new Date(b.kickoffTime).getTime() - new Date(a.kickoffTime).getTime());

  // 3. Decide which bucket to show based on the active tab
  let displayedMatches = [];
  if (activeTab === 'action') displayedMatches = actionMatches;
  if (activeTab === 'locked') displayedMatches = lockedMatches;
  if (activeTab === 'finished') displayedMatches = finishedMatches;

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-200 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('action')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'action' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Yet to pick ({actionMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('locked')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'locked' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
          Selected ({lockedMatches.length})
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'finished' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
        >
          History ({finishedMatches.length})
        </button>
      </div>

      {/* Render the matches for the active tab */}
      <div className="space-y-4">
        {displayedMatches.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-500 font-medium text-lg">No matches in this tab right now</p>
          </div>
        ) : (
          displayedMatches.map(match => {
            // Find the exact pick object for this match
            const specificPick = userPicks.find(pick => pick.matchId === match._id);
            
            return (
              <MatchCard 
                key={match._id} 
                match={match} 
                userId={userId} 
                userPick={specificPick} // Passes the actual pick data down!
              />
            )
          })
        )}
      </div>
    </div>
  );
}