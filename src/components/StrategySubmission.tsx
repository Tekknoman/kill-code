import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useGameStore } from '../store/gameStore';
import { useGameTimer } from '../hooks/useGameTimer';
import { useWebRTCContext } from '../context/WebRTCContext';
import { Timer } from './Timer';

export const StrategySubmission: React.FC = () => {
  const [strategyInput, setStrategyInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const {
    currentPlayerId,
    players,
    strategies,
    strategyTimeLimit,
    scenarioText,
    scenarioImageUrl,
    addStrategy,
    setPhase,
  } = useGameStore();
  
  const { startTimer, timeRemaining, isTimerActive } = useGameTimer();
  const { sendMessage } = useWebRTCContext();
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  const activePlayers = players.filter(p => p.isConnected);
  const hasSubmittedStrategy = strategies.some(s => s.playerId === currentPlayerId);
  const allStrategiesSubmitted = strategies.length >= activePlayers.length;
  
  // Start timer when component mounts
  useEffect(() => {
    if (!isTimerActive) {
      startTimer(strategyTimeLimit);
    }
  }, [isTimerActive, strategyTimeLimit, startTimer]);
  
  // Auto-submit empty strategy when timer expires
  useEffect(() => {
    if (timeRemaining === 0 && !hasSubmittedStrategy && !hasSubmitted) {
      handleSubmitStrategy();
    }
  }, [timeRemaining, hasSubmittedStrategy, hasSubmitted]);
  
  // Move to outcomes phase when all strategies are submitted
  useEffect(() => {
    if (allStrategiesSubmitted && strategies.length > 0) {
      setTimeout(() => {
        setPhase('outcomes');
      }, 2000); // Give a moment to see all submissions
    }
  }, [allStrategiesSubmitted, strategies.length, setPhase]);
  
  // Update strategy input with speech recognition
  useEffect(() => {
    if (transcript) {
      setStrategyInput(transcript);
    }
  }, [transcript]);
  
  const handleStartListening = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    resetTranscript();
    SpeechRecognition.startListening({ continuous: true });
  };
  
  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };
  
  const handleSubmitStrategy = () => {
    if (hasSubmittedStrategy || hasSubmitted) return;
    
    const strategy = {
      playerId: currentPlayerId,
      text: strategyInput.trim() || 'No strategy submitted',
      submittedAt: Date.now(),
    };
    
    addStrategy(strategy);
    setHasSubmitted(true);
    
    // Send strategy to all players
    sendMessage({
      type: 'strategy_submission',
      data: strategy,
    });
  };
  
  if (hasSubmittedStrategy || hasSubmitted) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Timer />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Strategy Submitted</h2>
              <p className="text-gray-400 mb-4">
                Your survival strategy has been submitted. Waiting for other players...
              </p>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Your Strategy:</h4>
                <p className="text-gray-300">
                  {strategies.find(s => s.playerId === currentPlayerId)?.text || strategyInput}
                </p>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress:</span>
                  <span className="text-sm text-gray-400">
                    {strategies.length} / {activePlayers.length} players
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(strategies.length / activePlayers.length) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-bold mb-4">The Scenario</h3>
              {scenarioImageUrl && (
                <img
                  src={scenarioImageUrl}
                  alt="Scenario"
                  className="w-full rounded-lg mb-4"
                />
              )}
              <p className="text-gray-300">{scenarioText}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Timer />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Submit Your Strategy</h2>
            <p className="text-gray-400 mb-6">
              How will you survive this scenario? Be creative and think strategically!
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Survival Strategy
                </label>
                <textarea
                  value={strategyInput}
                  onChange={(e) => setStrategyInput(e.target.value)}
                  placeholder="Describe your survival strategy..."
                  className="input-field h-32 resize-none"
                  maxLength={400}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {strategyInput.length}/400
                </div>
              </div>
              
              {browserSupportsSpeechRecognition && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleStartListening}
                    disabled={listening}
                    className={`btn-secondary flex-1 ${listening ? 'opacity-50' : ''}`}
                  >
                    {listening ? 'Listening...' : '🎤 Speak Strategy'}
                  </button>
                  
                  {listening && (
                    <button
                      onClick={handleStopListening}
                      className="btn-danger"
                    >
                      Stop
                    </button>
                  )}
                </div>
              )}
              
              <button
                onClick={handleSubmitStrategy}
                className="btn-primary w-full"
              >
                Submit Strategy
              </button>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Submissions:</span>
                <span className="text-sm text-gray-400">
                  {strategies.length} / {activePlayers.length} players
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(strategies.length / activePlayers.length) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-bold mb-4">The Scenario</h3>
            {scenarioImageUrl && (
              <img
                src={scenarioImageUrl}
                alt="Scenario"
                className="w-full rounded-lg mb-4"
              />
            )}
            <p className="text-gray-300 mb-4">{scenarioText}</p>
            
            <div className="text-sm text-gray-400">
              <p>Think about:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>What resources are available?</li>
                <li>What are the immediate dangers?</li>
                <li>What's your first priority?</li>
                <li>How will you stay safe long-term?</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Remember: The AI will judge your strategy and determine if you survive!</p>
        </div>
      </div>
    </div>
  );
};
