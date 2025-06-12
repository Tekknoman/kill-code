import React from 'react';
import { useGameStore } from '../store/gameStore';

export const PlayerList: React.FC = () => {
  const { players, currentPlayerId, currentScenarioMakerId, currentPhase } = useGameStore();
  
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Players ({players.length})</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              player.id === currentPlayerId
                ? 'bg-blue-900 border border-blue-600'
                : 'bg-gray-700'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  player.isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="font-medium">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
              {player.id === currentScenarioMakerId && currentPhase === 'scenario' && (
                <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                  Scenario Maker
                </span>
              )}
            </div>
            <div className="text-sm text-gray-300">
              Score: {player.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
