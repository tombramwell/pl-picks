"use client";

import { useState } from 'react';

export default function BulkImportButton() {
  const [status, setStatus] = useState('');

  const handleImport = async () => {
    if (!confirm("WARNING: This will delete all current matches/players and replace them with your JSON files. Continue?")) return;
    
    setStatus("Importing...");
    const res = await fetch('/api/admin/bulk-import', { method: 'POST' });
    const data = await res.json();
    
    if (res.ok) {
      setStatus(`Success! Added ${data.matchesCount} matches and ${data.playersCount} players.`);
      // Refresh the page to show new matches
      window.location.reload(); 
    } else {
      setStatus(`Error: ${data.error}`);
    }
  };

  return (
    <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-bold text-yellow-800 mb-2">Tournament Data Setup</h3>
      <button 
        onClick={handleImport}
        className="px-4 py-2 bg-yellow-600 text-white font-bold rounded hover:bg-yellow-700 transition-colors"
      >
        Run Bulk Import
      </button>
      {status && <p className="mt-2 text-sm font-medium text-yellow-900">{status}</p>}
    </div>
  );
}