import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Lobby } from './Lobby';
import { ScenarioCreation } from './ScenarioCreation';
import { StrategySubmission } from './StrategySubmission';
import { OutcomeGeneration } from './OutcomeGeneration';
import { GameResults } from './GameResults';
import { PlayerList } from './PlayerList';

export const Game: React.FC = () => {
  const { currentPhase, currentRound, totalRounds } = useGameStore();
  
  const renderPhase = () => {
    switch (currentPhase) {
      case 'lobby':
        return <Lobby />;
      case 'scenario':
        return <ScenarioCreation />;
      case 'strategy':
        return <StrategySubmission />;
      case 'outcomes':
        return <OutcomeGeneration />;
      case 'results':
        return <GameResults />;
      default:
        return <Lobby />;
    }
  };
  
  const showGameHeader = currentPhase !== 'lobby' && currentPhase !== 'results';
  
  return (
    <div className="min-h-screen bg-gray-900">
      {showGameHeader && (
        <div className="bg-gray-900 border-b border-gray-700 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Kill Code</h1>
              <p className="text-gray-400 text-sm">
                Round {currentRound} of {totalRounds}
              </p>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-400">
                Phase: <span className="text-white capitalize">{currentPhase}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex">
        <div className="flex-1">
          {renderPhase()}
        </div>
        
        {showGameHeader && (
          <div className="w-80 bg-gray-900 border-l border-gray-700 p-4 hidden lg:block">
            <PlayerList />
          </div>
        )}
      </div>
    </div>
  );
};
