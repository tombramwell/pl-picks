'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard({ matches, players, managers }) {
  const [activeTab, setActiveTab] = useState('matches'); // 'matches' | 'managers'
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncingPlayers, setSyncingPlayers] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const router = useRouter();
  const [syncingFixtures, setSyncingFixtures] = useState(false);
  const [fixtureSyncResult, setFixtureSyncResult] = useState(null);
  const [fixtureSyncError, setFixtureSyncError] = useState(null);

  const handlePlayerSync = async () => {
  setSyncingPlayers(true);
  setSyncResult(null);
  setSyncError(null);

  try {
    const response = await fetch(
      '/api/admin/sync-premier-league',
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || 'Player sync failed'
      );
    }

    setSyncResult(data);
  } catch (error) {
    console.error(
      'Player sync error:',
      error
    );
    router.refresh();

    setSyncError(
      error.message ||
      'Player sync failed'
    );
  } finally {
    setSyncingPlayers(false);
  }
};

  const handleFixtureSync = async () => {
  setSyncingFixtures(true);
  setFixtureSyncResult(null);
  setFixtureSyncError(null);

  try {
    const response = await fetch(
      '/api/admin/sync-fixtures',
      {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.error || 'Fixture sync failed'
      );
    }

    setFixtureSyncResult(data);

    router.refresh();
  } catch (error) {
    console.error(
      'Fixture sync error:',
      error
    );

    setFixtureSyncError(
      error.message ||
      'Fixture sync failed'
    );
  } finally {
    setSyncingFixtures(false);
  }
};
  
  // Match States
  const [isFinished, setIsFinished] = useState(false);
  const [scoreTeamA, setScoreTeamA] = useState(0);
  const [scoreTeamB, setScoreTeamB] = useState(0);
  const [playerGoals, setPlayerGoals] = useState({});

  // Match Functions
  const handleSelectMatch = (match) => {
    setSelectedMatch(match);
    setIsFinished(match.isFinished || false);
    setScoreTeamA(match.scoreTeamA || 0);
    setScoreTeamB(match.scoreTeamB || 0);
    setPlayerGoals({});
  };

  const handleGoalChange = (playerId, goals) => {
    setPlayerGoals(prev => ({ ...prev, [playerId]: parseInt(goals) || 0 }));
  };

  const handleSaveMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: selectedMatch._id, isFinished, scoreTeamA, scoreTeamB, playerGoals })
      });
      if (res.ok) {
        alert('Match updated!');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Manager Functions
  const handleTogglePayment = async (email, currentStatus) => {
    try {
      const res = await fetch('/api/admin/entrants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, hasPaid: !currentStatus })
      });
      if (res.ok) window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-gray-300 shadow-sm">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b-2 border-gray-200 pb-4">
        <button 
          onClick={() => { setActiveTab('matches'); setSelectedMatch(null); }}
          className={`font-bold uppercase tracking-wider px-4 py-2 ${activeTab === 'matches' ? 'bg-barclays-blue text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          Update Matches
        </button>
        <button 
          onClick={() => { setActiveTab('managers'); setSelectedMatch(null); }}
          className={`font-bold uppercase tracking-wider px-4 py-2 ${activeTab === 'managers' ? 'bg-barclays-blue text-white' : 'bg-gray-100 text-gray-500'}`}
        >
          Prize Pot Entry
        </button>
      </div>

      {/* MANAGERS TAB */}
      {activeTab === 'managers' && (
        <div className="space-y-2">
          {managers.map(m => (
            <div key={m.email} className="flex justify-between items-center p-4 border border-gray-200 bg-gray-50">
              <span className="font-bold">{m.email}</span>
              <button 
                onClick={() => handleTogglePayment(m.email, m.hasPaid)}
                className={`px-4 py-2 font-black uppercase text-xs tracking-wider ${m.hasPaid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}
              >
                {m.hasPaid ? '✓ PAID £10' : 'UNPAID'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">
        Premier League Players
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Update squads, transfers and squad numbers.
      </p>
    </div>

    <button
      onClick={handlePlayerSync}
      disabled={syncingPlayers}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {syncingPlayers
        ? 'Syncing...'
        : 'Sync Players'}
    </button>
  </div>

  {syncingPlayers && (
    <p className="mt-4 text-sm text-gray-500">
      Fetching the latest Premier League squads...
      This may take around 20–30 seconds.
    </p>
  )}

  {syncError && (
    <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
      {syncError}
    </div>
  )}

  {syncResult && (
    <div className="mt-4 p-4 rounded-lg bg-green-50 text-green-800">
      <p className="font-semibold">
        Player sync completed
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
        <div>
          <div className="font-bold">
            {syncResult.clubsSuccessful}/
            {syncResult.clubsFound}
          </div>
          <div className="text-green-700">
            Clubs
          </div>
        </div>

        <div>
          <div className="font-bold">
            {syncResult.playersProcessed}
          </div>
          <div className="text-green-700">
            Players
          </div>
        </div>

        <div>
          <div className="font-bold">
            {syncResult.transfersDetected}
          </div>
          <div className="text-green-700">
            Transfers
          </div>
        </div>

        <div>
          <div className="font-bold">
            {syncResult.squadNumberChanges}
          </div>
          <div className="text-green-700">
            Number changes
          </div>
        </div>
      </div>
    </div>
  )}
</div>

<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-gray-900">
        Premier League Fixtures
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Check for fixture date and kick-off time changes.
      </p>
    </div>

    <button
      onClick={handleFixtureSync}
      disabled={syncingFixtures}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {syncingFixtures
        ? 'Syncing...'
        : 'Sync Fixtures'}
    </button>
  </div>

  {syncingFixtures && (
    <p className="mt-4 text-sm text-gray-500">
      Checking the latest Premier League fixture list...
    </p>
  )}

  {fixtureSyncError && (
    <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
      {fixtureSyncError}
    </div>
  )}

  {fixtureSyncResult && (
    <div className="mt-4 p-4 rounded-lg bg-green-50 text-green-800">
      <p className="font-semibold">
        Fixture sync completed
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
        <div>
          <div className="font-bold">
            {fixtureSyncResult.fixturesFound}
          </div>
          <div className="text-green-700">
            Fixtures checked
          </div>
        </div>

        <div>
          <div className="font-bold">
            {fixtureSyncResult.fixturesUpdated}
          </div>
          <div className="text-green-700">
            Updated
          </div>
        </div>

        <div>
          <div className="font-bold">
            {fixtureSyncResult.kickoffChanges}
          </div>
          <div className="text-green-700">
            Kick-off changes
          </div>
        </div>

        <div>
          <div className="font-bold">
            {fixtureSyncResult.errors?.length || 0}
          </div>
          <div className="text-green-700">
            Errors
          </div>
        </div>
      </div>

      {fixtureSyncResult.changes?.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold mb-2">
            Changes detected
          </p>

          {fixtureSyncResult.changes.map(
            (change, index) => (
              <div
                key={index}
                className="text-sm border-t border-green-200 py-2"
              >
                <strong>
                  {change.fixture}
                </strong>

                {change.changes?.kickoffTime && (
                  <div>
                    {
                      change.changes.kickoffTime.old
                    }
                    {' → '}
                    {
                      change.changes.kickoffTime.new
                    }
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )}
</div>

      {/* MATCHES TAB (List View) */}
      {activeTab === 'matches' && !selectedMatch && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map(m => (
            <button 
              key={m._id} 
              onClick={() => handleSelectMatch(m)}
              className={`p-4 border text-left transition ${m.isFinished ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}
            >
              <div className="text-xs text-gray-500 mb-1 font-bold">GW {m.gameweek}</div>
              <div className="font-black uppercase">{m.teamA} v {m.teamB}</div>
            </button>
          ))}
        </div>
      )}

      {/* MATCHES TAB (Detail View) */}
      {activeTab === 'matches' && selectedMatch && (
        <div>
          <button onClick={() => setSelectedMatch(null)} className="text-sm text-barclays-cyan font-bold uppercase mb-4 hover:underline">
            ◀ Back to Matches
          </button>
          
          <h2 className="text-2xl font-black uppercase mb-6">{selectedMatch.teamA} v {selectedMatch.teamB}</h2>

          <div className="flex gap-4 items-end mb-8 bg-gray-100 p-4 border-l-4 border-barclays-blue">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{selectedMatch.teamA}</label>
              <input type="number" min="0" value={scoreTeamA} onChange={e => setScoreTeamA(e.target.value)} className="w-16 p-2 border-2 border-gray-300 font-black" />
            </div>
            <div className="pb-2 font-bold">-</div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{selectedMatch.teamB}</label>
              <input type="number" min="0" value={scoreTeamB} onChange={e => setScoreTeamB(e.target.value)} className="w-16 p-2 border-2 border-gray-300 font-black" />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <input type="checkbox" id="finished" checked={isFinished} onChange={e => setIsFinished(e.target.checked)} className="w-5 h-5" />
              <label htmlFor="finished" className="font-bold uppercase tracking-wider">Match Finished?</label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-black uppercase tracking-wider mb-3 border-b-2 border-barclays-cyan pb-2">{selectedMatch.teamA} Goalscorers</h3>
              {players.filter(p => p.team === selectedMatch.teamA).map(p => (
                <div key={p._id} className="flex justify-between items-center text-sm border-b border-gray-200 py-1">
                  <span className="font-bold">{p.name}</span>
                  <input type="number" min="0" placeholder="0" onChange={e => handleGoalChange(p._id, e.target.value)} className="w-12 p-1 border border-gray-300 text-center" />
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-black uppercase tracking-wider mb-3 border-b-2 border-barclays-cyan pb-2">{selectedMatch.teamB} Goalscorers</h3>
              {players.filter(p => p.team === selectedMatch.teamB).map(p => (
                <div key={p._id} className="flex justify-between items-center text-sm border-b border-gray-200 py-1">
                  <span className="font-bold">{p.name}</span>
                  <input type="number" min="0" placeholder="0" onChange={e => handleGoalChange(p._id, e.target.value)} className="w-12 p-1 border border-gray-300 text-center" />
                </div>
              ))}
            </div>
          </div>

          <button onClick={handleSaveMatch} disabled={loading} className="w-full bg-barclays-dark text-white font-black uppercase tracking-widest py-4 hover:bg-black transition border-b-4 border-barclays-blue">
            {loading ? 'PROCESSING...' : 'SAVE SCORES'}
          </button>
        </div>
      )}
    </div>
  );
}