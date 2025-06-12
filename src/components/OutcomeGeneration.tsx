import React, { useState, useEffect } from 'react';
import { usePollinationsText, usePollinationsImage } from '@pollinations/react';
import { useGameStore } from '../store/gameStore';
import { useWebRTCContext } from '../context/WebRTCContext';

interface PlayerOutcome {
  playerId: string;
  playerName: string;
  strategy: string;
  narrative: string;
  imagePrompt: string;
  imageUrl: string;
  survived: boolean;
  scoreGained: number;
}

export const OutcomeGeneration: React.FC = () => {
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [generatedOutcomes, setGeneratedOutcomes] = useState<PlayerOutcome[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [narrativePrompts, setNarrativePrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  
  const {
    players,
    strategies,
    scenarioText,
    addOutcome,
    updatePlayer,
    setPhase,
    nextRound,
    currentRound,
    totalRounds,
  } = useGameStore();
  
  const { sendMessage } = useWebRTCContext();
  
  // Generate narrative using Pollinations
  const narrativeText = usePollinationsText(
    narrativePrompts[currentPromptIndex] || '', 
    { 
      seed: -1, // Random seed for variety
      model: 'openai',
      systemPrompt: 'You are a dramatic storyteller specializing in survival scenarios. Always end your response with either "SURVIVED" or "DIED" in all caps.'
    }
  );
  
  // Generate outcome image using Pollinations
  const outcomeImageUrl = usePollinationsImage(
    narrativeText ? `A dramatic survival scene: ${narrativeText.slice(0, 100)}...` : '',
    {
      width: 512,
      height: 512,
      model: 'turbo',
      seed: -1,
      nologo: true,
      enhance: false
    }
  );
  
  // Initialize prompts when component mounts
  useEffect(() => {
    if (strategies.length > 0 && narrativePrompts.length === 0) {
      const prompts = strategies.map(strategy => {
        const player = players.find(p => p.id === strategy.playerId);
        if (!player) return '';
        
        return `Given this survival scenario: "${scenarioText}"

And this player's strategy: "${strategy.text}"

Write a dramatic 2-3 sentence outcome that determines if they survived or died. Be creative and reference specific details from both the scenario and strategy. End with either "SURVIVED" or "DIED" in all caps.`;
      });
      
      setNarrativePrompts(prompts);
    }
  }, [strategies, players, scenarioText, narrativePrompts.length]);
  
  // Process narrative when it's generated
  useEffect(() => {
    if (narrativeText && currentPromptIndex < strategies.length) {
      const strategy = strategies[currentPromptIndex];
      const player = players.find(p => p.id === strategy.playerId);
      
      if (player) {
        const survived = narrativeText.includes('SURVIVED');
        const scoreGained = survived ? 10 : 0;
        
        const outcome: PlayerOutcome = {
          playerId: strategy.playerId,
          playerName: player.name,
          strategy: strategy.text,
          narrative: narrativeText.replace(/(SURVIVED|DIED)$/, '').trim(),
          imagePrompt: `A dramatic survival scene: ${narrativeText.slice(0, 100)}`,
          imageUrl: outcomeImageUrl || '',
          survived,
          scoreGained,
        };
        
        setGeneratedOutcomes(prev => [...prev, outcome]);
        
        // Add to game state
        addOutcome({
          playerId: strategy.playerId,
          text: outcome.narrative,
          imageUrl: outcome.imageUrl,
          audioUrl: undefined,
          survived,
          score: scoreGained,
        });
        
        // Update player score
        updatePlayer(strategy.playerId, {
          score: player.score + scoreGained
        });
        
        // Broadcast outcome
        sendMessage({
          type: 'outcome_broadcast',
          data: {
            playerId: strategy.playerId,
            text: outcome.narrative,
            imageUrl: outcome.imageUrl,
            audioUrl: undefined,
            survived,
            score: scoreGained,
          }
        });
        
        // Move to next strategy or finish generation
        if (currentPromptIndex + 1 < strategies.length) {
          setCurrentPromptIndex(prev => prev + 1);
        } else {
          setIsGenerating(false);
          // Start revealing outcomes after a short delay
          setTimeout(() => {
            setCurrentRevealIndex(0);
          }, 1000);
        }
      }
    }
  }, [narrativeText, outcomeImageUrl, currentPromptIndex, strategies, players]);
  
  // Remove the old generateOutcomes function and related mock functions
  
  // Auto-advance revelation every 5 seconds
  useEffect(() => {
    if (currentRevealIndex >= 0 && currentRevealIndex < generatedOutcomes.length) {
      const timer = setTimeout(() => {
        setCurrentRevealIndex(prev => prev + 1);
      }, 5000);
      
      return () => clearTimeout(timer);
    } else if (currentRevealIndex >= generatedOutcomes.length && generatedOutcomes.length > 0) {
      // All outcomes revealed, move to next round or results
      setTimeout(() => {
        if (currentRound < totalRounds) {
          nextRound();
        } else {
          setPhase('results');
        }
      }, 3000);
    }
  }, [currentRevealIndex, generatedOutcomes.length, currentRound, totalRounds, nextRound, setPhase]);
  
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="card text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-6">Determining Fates...</h2>
          <div className="animate-pulse-slow mb-6">
            <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto"></div>
          </div>
          <p className="text-gray-400 mb-4">
            The AI is analyzing each strategy and determining who survives...
          </p>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (currentRevealIndex >= generatedOutcomes.length) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="card text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-6">Round Complete!</h2>
          <p className="text-gray-400 mb-6">
            {currentRound < totalRounds 
              ? `Preparing for round ${currentRound + 1}...`
              : 'Calculating final results...'
            }
          </p>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }
  
  const currentOutcome = generatedOutcomes[currentRevealIndex];
  
  if (!currentOutcome) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="card text-center">
          <h2 className="text-2xl font-bold mb-4">Preparing revelations...</h2>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-2">Fate Revealed</h2>
          <p className="text-gray-400">
            {currentRevealIndex + 1} of {generatedOutcomes.length} players
          </p>
        </div>
        
        <div className="card">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-2">{currentOutcome.playerName}</h3>
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <h4 className="font-medium mb-2">Their Strategy:</h4>
              <p className="text-gray-300 italic">"{currentOutcome.strategy}"</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold mb-4 text-lg">The Outcome:</h4>
              <p className="text-gray-300 text-lg leading-relaxed mb-6">
                {currentOutcome.narrative}
              </p>
              
              <div className={`text-center p-6 rounded-lg text-2xl font-bold ${
                currentOutcome.survived 
                  ? 'bg-green-900 text-green-300 border border-green-600' 
                  : 'bg-red-900 text-red-300 border border-red-600'
              }`}>
                {currentOutcome.survived ? '✅ SURVIVED' : '💀 DIED'}
              </div>
              
              {currentOutcome.survived && (
                <div className="text-center mt-4">
                  <span className="text-yellow-400 font-bold">
                    +{currentOutcome.scoreGained} points
                  </span>
                </div>
              )}
            </div>
            
            <div>
              {currentOutcome.imageUrl && (
                <img
                  src={currentOutcome.imageUrl}
                  alt="Outcome illustration"
                  className="w-full rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <div className="flex justify-center space-x-2 mb-4">
            {generatedOutcomes.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full ${
                  index < currentRevealIndex 
                    ? 'bg-green-500' 
                    : index === currentRevealIndex 
                    ? 'bg-blue-500' 
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={() => setCurrentRevealIndex(prev => Math.min(prev + 1, generatedOutcomes.length))}
            className="btn-secondary"
            disabled={currentRevealIndex >= generatedOutcomes.length - 1}
          >
            Next Revelation
          </button>
        </div>
      </div>
    </div>
  );
};
