import React from 'react';
import { useGameStore } from '../store/gameStore';

export const GameResults: React.FC = () => {
  const { players, resetGame, setPhase } = useGameStore();
  
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  
  const handlePlayAgain = () => {
    resetGame();
    setPhase('lobby');
  };
  
  const getRankEmoji = (index: number) => {
    switch (index) {
      case 0: return '🏆';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '🪦';
    }
  };
  
  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return 'bg-yellow-900 border-yellow-600 text-yellow-300';
      case 1: return 'bg-gray-700 border-gray-500 text-gray-300';
      case 2: return 'bg-orange-900 border-orange-600 text-orange-300';
      default: return 'bg-gray-800 border-gray-600 text-gray-400';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Game Over!</h1>
          <p className="text-gray-400 text-lg">
            Survival of the fittest has been determined
          </p>
        </div>
        
        {winner && (
          <div className="card text-center mb-8 bg-gradient-to-r from-yellow-900 to-yellow-800 border-yellow-600">
            <h2 className="text-3xl font-bold mb-4 text-yellow-300">
              🏆 Champion Survivor 🏆
            </h2>
            <div className="text-2xl font-bold mb-2">{winner.name}</div>
            <div className="text-xl text-yellow-400">
              {winner.score} points
            </div>
            <p className="text-yellow-200 mt-4">
              Master of survival and strategic thinking!
            </p>
          </div>
        )}
        
        <div className="card">
          <h3 className="text-2xl font-bold mb-6">Final Leaderboard</h3>
          
          <div className="space-y-4">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${getRankColor(index)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">
                      {getRankEmoji(index)}
                    </div>
                    <div>
                      <div className="font-bold text-lg">
                        #{index + 1} {player.name}
                      </div>
                      <div className="text-sm opacity-75">
                        {index === 0 && 'Apex Survivor'}
                        {index === 1 && 'Skilled Survivor'}
                        {index === 2 && 'Lucky Survivor'}
                        {index > 2 && 'Brave Attempt'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {player.score}
                    </div>
                    <div className="text-sm opacity-75">
                      points
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-8 text-center space-y-4">
          <button
            onClick={handlePlayAgain}
            className="btn-primary text-lg px-8 py-3"
          >
            Play Again
          </button>
          
          <div className="text-gray-400">
            <p>Thanks for playing Kill Code!</p>
            <p className="text-sm mt-2">
              Share your survival stories and invite more friends to join the challenge.
            </p>
          </div>
        </div>
        
        <div className="mt-8 card bg-gray-900">
          <h4 className="font-bold mb-4">Game Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {players.filter(p => p.score > 0).length}
              </div>
              <div className="text-sm text-gray-400">Survivors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">
                {players.filter(p => p.score === 0).length}
              </div>
              <div className="text-sm text-gray-400">Casualties</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {Math.max(...players.map(p => p.score), 0)}
              </div>
              <div className="text-sm text-gray-400">High Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">
                {players.length}
              </div>
              <div className="text-sm text-gray-400">Total Players</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
