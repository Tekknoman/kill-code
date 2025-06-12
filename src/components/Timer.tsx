import React from 'react';
import { useGameTimer } from '../hooks/useGameTimer';
import { useGameStore } from '../store/gameStore';

export const Timer: React.FC = () => {
  const { timeRemaining, isTimerActive, formatTime } = useGameTimer();
  const { currentPhase } = useGameStore();
  
  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-500';
    if (timeRemaining <= 30) return 'text-yellow-500';
    return 'text-white';
  };
  
  const getPhaseLabel = () => {
    switch (currentPhase) {
      case 'scenario': return 'Scenario Creation';
      case 'strategy': return 'Strategy Submission';
      case 'outcomes': return 'Generating Outcomes';
      default: return '';
    }
  };
  
  if (!isTimerActive || currentPhase === 'lobby' || currentPhase === 'results') {
    return null;
  }
  
  return (
    <div className="card text-center">
      <div className="text-sm text-gray-400 mb-2">
        {getPhaseLabel()}
      </div>
      <div className={`text-4xl font-bold ${getTimerColor()} ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>
        {formatTime(timeRemaining)}
      </div>
      {timeRemaining <= 10 && (
        <div className="text-sm text-red-400 mt-2 animate-bounce">
          Time's almost up!
        </div>
      )}
    </div>
  );
};
