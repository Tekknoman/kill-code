import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { useWebRTCContext } from '../context/WebRTCContext';
import { PlayerList } from './PlayerList';
import { getRoomIdFromUrl, setRoomIdInUrl } from '../utils/gameState';
import { getOrCreatePlayerId, getPlayerName, setPlayerName as savePlayerName } from '../utils/playerId';

export const Lobby: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  
  const {
    players,
    isHost,
    totalRounds,
    scenarioTimeLimit,
    strategyTimeLimit,
    setGameSettings,
    setCurrentPlayer,
    addPlayer,
    setPhase,
    loadSavedState,
  } = useGameStore();
  
  const { connect, isConnected, isConnecting, error, roomId, sendMessage } = useWebRTCContext();
  
  // Try to load saved state on component mount
  useEffect(() => {
    // Load persistent player name if available
    const savedPlayerName = getPlayerName();
    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
    }
    
    const urlRoomId = getRoomIdFromUrl();
    const hasSavedState = loadSavedState();
    
    if (hasSavedState && urlRoomId) {
      // Auto-reconnect if we have both saved state and room ID in URL
      const savedState = useGameStore.getState();
      const persistentPlayerId = getOrCreatePlayerId();
      
      if (persistentPlayerId && savedState.players.length > 0) {
        // Try to find the player by persistent ID
        let currentPlayer = savedState.players.find(p => p.id === persistentPlayerId);
        
        // If not found by persistent ID, try to find by stored currentPlayerId (fallback)
        if (!currentPlayer && savedState.currentPlayerId) {
          currentPlayer = savedState.players.find(p => p.id === savedState.currentPlayerId);
        }
        
        if (currentPlayer) {
          setPlayerName(currentPlayer.name);
          setJoinRoomCode(urlRoomId);
          // Auto-connect after a short delay
          setTimeout(() => {
            console.log('🔄 Auto-reconnecting with persistent ID:', persistentPlayerId);
            connect(urlRoomId, savedState.isHost, currentPlayer.name, persistentPlayerId);
          }, 1000);
        }
      }
    } else if (urlRoomId && !hasSavedState) {
      // Just set the room code if it's in URL but no saved state
      setJoinRoomCode(urlRoomId);
      setShowCreateRoom(false);
    }
  }, []);
  
  const handleCreateRoom = async () => {
    if (!playerName.trim()) return;
    
    const persistentPlayerId = getOrCreatePlayerId();
    savePlayerName(playerName.trim()); // Save name to localStorage
    
    setCurrentPlayer(persistentPlayerId);
    addPlayer({
      id: persistentPlayerId,
      name: playerName.trim(),
      score: 0,
      isConnected: true,
    });
    
    console.log('🏠 Creating room with persistent player ID:', persistentPlayerId);
    // Connect as host - the hook will generate a room code
    connect('', true, playerName.trim(), persistentPlayerId);
  };
  
  const handleJoinRoom = async () => {
    if (!playerName.trim() || !joinRoomCode.trim()) return;
    
    const persistentPlayerId = getOrCreatePlayerId();
    savePlayerName(playerName.trim()); // Save name to localStorage
    
    setCurrentPlayer(persistentPlayerId);
    addPlayer({
      id: persistentPlayerId,
      name: playerName.trim(),
      score: 0,
      isConnected: true,
    });
    
    console.log('🚪 Joining room with persistent player ID:', persistentPlayerId);
    // Set room ID in URL
    setRoomIdInUrl(joinRoomCode.trim().toUpperCase());
    
    // Connect to host
    connect(joinRoomCode.trim().toUpperCase(), false, playerName.trim(), persistentPlayerId);
  };
  
  const handleStartGame = () => {
    console.log('🎮 Starting game with', players.length, 'players');
    if (players.length < 2) return;
    
    // Set the first player as scenario maker
    const firstPlayer = players[0];
    console.log('🎭 Setting scenario maker:', firstPlayer);
    useGameStore.getState().setScenarioMaker(firstPlayer.id);
    setPhase('scenario');
    
    // Broadcast game state change to all players
    console.log('📡 Broadcasting game state sync');
    sendMessage({
      type: 'game_state_sync',
      data: {
        currentPhase: 'scenario',
        scenarioMakerId: firstPlayer.id,
      }
    });
  };
  
  if (isConnected && players.length > 0) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Kill Code</h1>
            
            {/* Room Code Display */}
            {roomId ? (
              <div className="bg-green-900 border border-green-600 rounded-lg p-4 mb-4 max-w-md mx-auto">
                <div className="text-green-300 text-sm font-medium mb-1">
                  {isHost ? 'Your Room Code:' : 'Connected to Room:'}
                </div>
                <div className="text-3xl font-bold text-green-100 tracking-[0.5rem] text-center mb-2">
                  {roomId}
                </div>
                {isHost && (
                  <div className="text-green-400 text-xs text-center">
                    Share this code with friends to join
                  </div>
                )}
              </div>
            ) : isConnecting ? (
              <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 mb-4 max-w-md mx-auto">
                <div className="text-blue-300 text-sm font-medium mb-1 text-center">
                  {isHost ? 'Creating Room...' : 'Joining Room...'}
                </div>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-300"></div>
                </div>
              </div>
            ) : null}
            
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
              {isConnected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400">Connected</span>
                </>
              ) : isConnecting ? (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-blue-400">Connecting...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <PlayerList />
            </div>
            
            <div className="card">
              <h3 className="text-lg font-bold mb-4">Game Settings</h3>
              
              {isHost ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Total Rounds
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={totalRounds}
                      onChange={(e) => setGameSettings({ totalRounds: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Scenario Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={scenarioTimeLimit}
                      onChange={(e) => setGameSettings({ scenarioTimeLimit: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Strategy Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={strategyTimeLimit}
                      onChange={(e) => setGameSettings({ strategyTimeLimit: parseInt(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                  
                  <button
                    onClick={handleStartGame}
                    disabled={players.length < 2}
                    className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors duration-200 ${
                      players.length >= 2
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Start Game ({players.length >= 2 ? 'Ready' : `Need ${2 - players.length} more player(s)`})
                  </button>
                </div>
              ) : (
                <div className="text-gray-400">
                  <p>Waiting for host to start the game...</p>
                  <div className="mt-4">
                    <p>Rounds: {totalRounds}</p>
                    <p>Scenario Time: {scenarioTimeLimit}s</p>
                    <p>Strategy Time: {strategyTimeLimit}s</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-6 p-4 bg-red-900 border border-red-600 rounded-lg text-red-100">
              Error: {error}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Kill Code</h1>
          <p className="text-gray-400">Survive or die in AI-generated scenarios</p>
        </div>
        
        <div className="card">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="input-field"
              maxLength={20}
            />
          </div>
          
          {!showCreateRoom ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Room Code (6 characters)
                </label>
                <input
                  type="text"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="input-field text-center tracking-widest text-lg"
                  maxLength={6}
                  style={{ letterSpacing: '0.3rem' }}
                />
              </div>
              
              <button
                onClick={handleJoinRoom}
                disabled={!playerName.trim() || !joinRoomCode.trim() || isConnecting}
                className="btn-primary w-full"
              >
                {isConnecting ? 'Joining...' : 'Join Room'}
              </button>
              
              <div className="text-center">
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Or create a new room
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={!playerName.trim() || isConnecting}
                className="btn-success w-full"
              >
                {isConnecting ? 'Creating...' : 'Create Room'}
              </button>
              
              <div className="text-center">
                <button
                  onClick={() => setShowCreateRoom(false)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Back to join room
                </button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-4 bg-red-900 border border-red-600 rounded-lg text-red-100 text-sm text-center">
              <div className="font-medium mb-1">Connection Error</div>
              <div>{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
