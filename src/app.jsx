import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState("scoreboard");
  const [players, setPlayers] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [playerNamesInput, setPlayerNamesInput] = useState("");
  const [selectedPlayersForMatch, setSelectedPlayersForMatch] = useState([]);
  const [pointsForMatch, setPointsForMatch] = useState(0);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editingPlayerIds, setEditingPlayerIds] = useState([]);
  const [editingPoints, setEditingPoints] = useState(0);
  const [notification, setNotification] = useState({ show: false, message: "" });

  // Editor linkin hallinta
  const [editorLink, setEditorLink] = useState("");

  // Alustetaan IndexedDB ja hoidetaan sync
  const dbPromise = indexedDB.open("pickleballDB", 1);

  useEffect(() => {
    dbPromise.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("data")) {
        const store = db.createObjectStore("data", { keyPath: "id" });
      }
    };

    dbPromise.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction("data", "readonly");
      const store = tx.objectStore("data");

      const dataReq = store.get("appData");
      dataReq.onsuccess = () => {
        if (dataReq.result) {
          setPlayers(dataReq.result.players || []);
          setMatchHistory(dataReq.result.matchHistory || []);
        } else {
          // Alustus ensimmäiseen käyttöön
          const initialPlayers = [
            { id: 1, name: "Alice", points: 850, gamesPlayed: 23 },
            { id: 2, name: "Bob", points: 765, gamesPlayed: 19 },
            { id: 3, name: "Charlie", points: 910, gamesPlayed: 27 },
            { id: 4, name: "Diana", points: 820, gamesPlayed: 21 },
            { id: 5, name: "Ethan", points: 780, gamesPlayed: 18 },
          ];
          setPlayers(initialPlayers);
          updateDB(initialPlayers, []);
        }
      };
    };
  }, []);

  // Päivitä IndexedDB
  const updateDB = (newPlayers, newHistory) => {
    const db = dbPromise.result;
    const tx = db.transaction("data", "readwrite");
    const store = tx.objectStore("data");

    store.put({
      id: "appData",
      players: newPlayers,
      matchHistory: newHistory
    });
  };

  // Generoi editor-linkki
  useEffect(() => {
    const sessionId = localStorage.getItem("sessionID") || Math.random().toString(36).substring(2, 10);
    localStorage.setItem("sessionID", sessionId);
    const link = `${window.location.origin}${window.location.pathname}#/editor/${sessionId}`;
    setEditorLink(link);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(editorLink).then(() => {
      showNotification("Link copied to clipboard!");
    });
  };

  const generateQRCode = () => {
    const canvas = document.getElementById("qr-canvas");
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = "#000000";

    for (let i = 0; i < 200; i += 20) {
      for (let j = 0; j < 200; j += 20) {
        if ((i + j) % 40 > 20) continue;
        ctx.fillRect(i, j, 10, 10);
      }
    }

    ctx.font = "14px Arial";
    ctx.fillStyle = "#000000";
    ctx.fillText("JOIN GAME", 40, 180);
  };

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: "" }), 3000);
  };

  // --- Pelaajien ja historialle muutokset ---

  useEffect(() => {
    updateDB(players, matchHistory);
  }, [players, matchHistory]);

  // --- Pelaajien hallinta ---

  const addPlayersFromInput = () => {
    if (!playerNamesInput.trim()) return;

    const names = playerNamesInput
      .split(/[,\n\.]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    const newPlayers = names.map(name => ({
      id: Date.now() + Math.random(),
      name,
      points: 0,
      gamesPlayed: 0
    }));

    setPlayers([...players, ...newPlayers]);
    setPlayerNamesInput("");
    showNotification(`${newPlayers.length} player(s) added.`);
  };

  const removePlayer = (id) => {
    const player = players.find(p => p.id === id);
    setPlayers(players.filter(p => p.id !== id));
    showNotification(`Player "${player.name}" removed.`);
  };

  const resetAllData = () => {
    if (window.confirm("Are you sure you want to reset all data?")) {
      setPlayers([]);
      setMatchHistory([]);
      showNotification("All data has been reset.");
    }
  };

  // --- Pelitulosten tallennus ---

  const submitMatch = () => {
    if (selectedPlayersForMatch.length < 1 || selectedPlayersForMatch.length > 2) {
      showNotification("Select 1 or 2 players for the match.");
      return;
    }

    if (pointsForMatch <= 0) {
      showNotification("Enter valid points.");
      return;
    }

    const updatedMatchHistory = [
      {
        id: Date.now(),
        playerIds: selectedPlayersForMatch,
        points: parseInt(pointsForMatch),
        timestamp: new Date().toLocaleString()
      },
      ...matchHistory
    ];

    setMatchHistory(updatedMatchHistory);
    setSelectedPlayersForMatch([]);
    setPointsForMatch(0);
    showNotification("Match result recorded!");

    const updatedPlayers = [...players];
    selectedPlayersForMatch.forEach(id => {
      const index = updatedPlayers.findIndex(p => p.id === id);
      updatedPlayers[index].points += parseInt(pointsForMatch);
      updatedPlayers[index].gamesPlayed += 1;
    });

    setPlayers(updatedPlayers);
  };

  // --- Historian muokkaus ---

  const startEditMatch = (match) => {
    setEditingMatchId(match.id);
    setEditingPlayerIds(match.playerIds);
    setEditingPoints(match.points);
  };

  const updateMatch = () => {
    if (editingPlayerIds.length < 1 || editingPlayerIds.length > 2) {
      showNotification("Select 1 or 2 players for the match.");
      return;
    }

    if (editingPoints <= 0) {
      showNotification("Enter valid points.");
      return;
    }

    const oldMatch = matchHistory.find(m => m.id === editingMatchId);
    const diff = editingPoints - oldMatch.points;

    const updatedPlayers = [...players];
    oldMatch.playerIds.forEach(id => {
      const index = updatedPlayers.findIndex(p => p.id === id);
      updatedPlayers[index].points -= oldMatch.points;
    });

    editingPlayerIds.forEach(id => {
      const index = updatedPlayers.findIndex(p => p.id === id);
      updatedPlayers[index].points += editingPoints;
    });

    const updatedMatchHistory = matchHistory.map(m =>
      m.id === editingMatchId
        ? { ...m, playerIds: editingPlayerIds, points: editingPoints }
        : m
    );

    setPlayers(updatedPlayers);
    setMatchHistory(updatedMatchHistory);
    setEditingMatchId(null);
    showNotification("Match result updated!");
  };

  const deleteMatch = (matchId) => {
    const matchToDelete = matchHistory.find(m => m.id === matchId);
    const updatedPlayers = [...players];

    matchToDelete.playerIds.forEach(id => {
      const index = updatedPlayers.findIndex(p => p.id === id);
      updatedPlayers[index].points -= matchToDelete.points;
      updatedPlayers[index].gamesPlayed -= 1;
    });

    setPlayers(updatedPlayers);
    setMatchHistory(matchHistory.filter(m => m.id !== matchId));
    showNotification("Match deleted.");
  };

  const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            Pickleball Scorekeeper
          </h1>
          <nav className="space-x-4 hidden md:flex">
            <button onClick={() => setActiveTab("scoreboard")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "scoreboard" ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>
              Scoreboard
            </button>
            <button onClick={() => setActiveTab("add-match")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "add-match" ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>
              Add Match
            </button>
            <button onClick={() => setActiveTab("add-player")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "add-player" ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>
              Add Players
            </button>
            <button onClick={() => setActiveTab("history")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "history" ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>
              History
            </button>
            <button onClick={() => setActiveTab("share")} className={`px-4 py-2 rounded-lg transition-all ${activeTab === "share" ? "bg-blue-600 text-white" : "hover:bg-blue-100"}`}>
              Share
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-t border-b border-gray-200">
        <div className="flex justify-around">
          <button onClick={() => setActiveTab("scoreboard")} className={`py-3 flex-1 text-center ${activeTab === "scoreboard" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            Scoreboard
          </button>
          <button onClick={() => setActiveTab("add-match")} className={`py-3 flex-1 text-center ${activeTab === "add-match" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            Add Match
          </button>
          <button onClick={() => setActiveTab("add-player")} className={`py-3 flex-1 text-center ${activeTab === "add-player" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            Add Players
          </button>
          <button onClick={() => setActiveTab("history")} className={`py-3 flex-1 text-center ${activeTab === "history" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            History
          </button>
          <button onClick={() => setActiveTab("share")} className={`py-3 flex-1 text-center ${activeTab === "share" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-600"}`}>
            Share
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Scoreboard Tab */}
        {activeTab === "scoreboard" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Leaderboard</h2>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="grid grid-cols-5 text-sm font-medium">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-2">Player</div>
                  <div className="col-span-1 text-center">Points</div>
                  <div className="col-span-1 text-center">Games</div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {sortedPlayers.map((player, index) => (
                  <div key={player.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-5 items-center">
                      <div className="col-span-1 text-center font-bold">{index + 1}</div>
                      <div className="col-span-2 font-medium">{player.name}</div>
                      <div className="col-span-1 text-center">{player.points}</div>
                      <div className="col-span-1 text-center">{player.gamesPlayed}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add Match Tab */}
        {activeTab === "add-match" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Add Match Result</h2>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Player(s)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => {
                        if (selectedPlayersForMatch.includes(player.id)) {
                          setSelectedPlayersForMatch(selectedPlayersForMatch.filter(id => id !== player.id));
                        } else {
                          setSelectedPlayersForMatch([...selectedPlayersForMatch, player.id]);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg border transition-all ${
                        selectedPlayersForMatch.includes(player.id)
                          ? "bg-green-100 border-green-500 text-green-700"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                <input
                  id="points"
                  type="number"
                  min="1"
                  value={pointsForMatch}
                  onChange={(e) => setPointsForMatch(e.target.value)}
                  className="w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={submitMatch}
                className="mt-4 w-full py-2 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Submit Match
              </button>
            </div>
          </div>
        )}

        {/* Add Players Tab */}
        {activeTab === "add-player" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Add New Players</h2>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-4">
                <label htmlFor="playerNames" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter player names (separated by commas, periods or line breaks)
                </label>
                <textarea
                  id="playerNames"
                  rows="5"
                  value={playerNamesInput}
                  onChange={(e) => setPlayerNamesInput(e.target.value)}
                  placeholder="Alice, Bob, Charlie"
                  className="w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={addPlayersFromInput}
                disabled={!playerNamesInput.trim()}
                className={`w-full py-2 px-4 rounded-lg font-medium text-white ${
                  !playerNamesInput.trim()
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                Add Players
              </button>

              <button
                onClick={resetAllData}
                className="mt-4 w-full py-2 px-4 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700"
              >
                Reset All Data
              </button>

              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Existing Players</h3>
                <ul className="space-y-2">
                  {players.map(player => (
                    <li key={player.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span>{player.name}</span>
                      <button
                        onClick={() => removePlayer(player.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Match History</h2>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="divide-y divide-gray-100">
                {matchHistory.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No matches yet.</div>
                ) : (
                  matchHistory.map(match => {
                    const matchPlayers = players.filter(p => match.playerIds.includes(p.id)).map(p => p.name).join(", ");
                    
                    return (
                      <div key={match.id} className="p-4 hover:bg-gray-50 transition-colors">
                        {editingMatchId === match.id ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Select Players</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                                {players.map(player => (
                                  <label key={player.id} className="inline-flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={editingPlayerIds.includes(player.id)}
                                      onChange={() => {
                                        if (editingPlayerIds.includes(player.id)) {
                                          setEditingPlayerIds(editingPlayerIds.filter(id => id !== player.id));
                                        } else {
                                          setEditingPlayerIds([...editingPlayerIds, player.id]);
                                        }
                                      }}
                                      className="form-checkbox h-4 w-4 text-blue-600"
                                    />
                                    <span className="ml-2">{player.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
                              <input
                                type="number"
                                min="1"
                                value={editingPoints}
                                onChange={(e) => setEditingPoints(parseInt(e.target.value))}
                                className="w-full border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={updateMatch}
                                className="flex-1 py-1 px-3 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingMatchId(null)}
                                className="flex-1 py-1 px-3 rounded bg-gray-300 text-gray-700 text-sm hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{matchPlayers}</p>
                              <p className="text-sm text-gray-600">+{match.points} points</p>
                              <p className="text-xs text-gray-400 mt-1">{match.timestamp}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => startEditMatch(match)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteMatch(match.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Share Tab */}
        {activeTab === "share" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-gray-800">Share Access</h2>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <p className="mb-4">Share this link with others to let them join as editors:</p>
              <div className="flex space-x-2 mb-4">
                <input
                  type="text"
                  readOnly
                  value={editorLink}
                  className="flex-1 border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>

              <div className="flex justify-center mb-4">
                <canvas id="qr-canvas" width="200" height="200"></canvas>
              </div>

              <button
                onClick={generateQRCode}
                className="w-full py-2 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Generate QR Code
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-up flex items-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-6 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Pickleball Scorekeeper &copy; {new Date().getFullYear()}</p>
          <p className="text-sm mt-1">Track your Americano-style pickleball game results</p>
        </div>
      </footer>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}