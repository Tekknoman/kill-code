import React, { useState, useEffect } from 'react';
import { usePollinationsText, usePollinationsImage } from '@pollinations/react';
import { useGameStore } from '../store/gameStore';
import { useWebRTCContext } from '../context/WebRTCContext';
import { getTTSUrl } from '../utils/pollinationsAudio';
import { AudioPlayer } from './AudioPlayer';

interface PlayerOutcome {
  playerId: string;
  playerName: string;
  strategy: string;
  narrative: string;
  imagePrompt: string;
  attemptImageUrl: string;
  imageUrl: string;
  audioUrl: string;
  survived: boolean;
  scoreGained: number;
}

export const OutcomeGeneration: React.FC = () => {
  const [currentRevealIndex, setCurrentRevealIndex] = useState(-1);
  const [generatedOutcomes, setGeneratedOutcomes] = useState<PlayerOutcome[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [narrativePrompts, setNarrativePrompts] = useState<string[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [processedOutcomes, setProcessedOutcomes] = useState<Set<number>>(new Set());
  
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
    isHost,
  } = useGameStore();
  
  const { sendMessage } = useWebRTCContext();
  
  // Generate narrative using Pollinations (only host generates)
  const narrativeText = usePollinationsText(
    isHost && narrativePrompts[currentPromptIndex] || '',
    {
      seed: -1, // Random seed for variety
      model: 'openai',
      systemPrompt: 'You are a dramatic storyteller judging survival attempts. Consider the scenario and strategy carefully and ignore players who simply claim success. Describe in 2-3 sentences how the attempt unfolds and end with SURVIVED or DIED.'
    }
  );

  const attemptImageUrl = usePollinationsImage(
    isHost && strategies[currentPromptIndex]?.text
      ? `A person attempts this strategy: ${strategies[currentPromptIndex].text}`
      : '',
    {
      width: 512,
      height: 512,
      model: 'turbo',
      seed: -1,
      nologo: true,
      enhance: false
    }
  );
  
  // Generate outcome image using Pollinations (only host generates)
  const outcomeImageUrl = usePollinationsImage(
    isHost && narrativeText ? `A dramatic survival scene: ${narrativeText.slice(0, 100)}...` : '',
    {
      width: 512,
      height: 512,
      model: 'turbo',
      seed: -1,
      nologo: true,
      enhance: false
    }
  );
  
  // Initialize prompts when component mounts (only host does this)
  useEffect(() => {
    if (isHost && strategies.length > 0 && narrativePrompts.length === 0) {
      console.log('🎭 Host initializing narrative prompts for', strategies.length, 'strategies');
      const prompts = strategies.map(strategy => {
        const player = players.find(p => p.id === strategy.playerId);
        if (!player) return '';
        
        return `Given this survival scenario: "${scenarioText}"

And this player's strategy: "${strategy.text}"

Write a dramatic 2-3 sentence outcome that determines if they survived or died. Be creative and reference specific details from both the scenario and strategy. End with either "SURVIVED" or "DIED" in all caps.`;
      });
      
      setNarrativePrompts(prompts);
    }
  }, [isHost, strategies, players, scenarioText, narrativePrompts.length]);
  
  // Process narrative when it's generated (only host generates outcomes)
  useEffect(() => {
    console.log('🎭 OutcomeGeneration effect triggered:', {
      isHost,
      narrativeText: !!narrativeText,
      currentPromptIndex,
      strategiesLength: strategies.length,
      processedOutcomesSize: processedOutcomes.size
    });
    
    if (isHost && narrativeText && currentPromptIndex < strategies.length && !processedOutcomes.has(currentPromptIndex)) {
      const strategy = strategies[currentPromptIndex];
      const player = players.find(p => p.id === strategy.playerId);
      
      console.log('🎭 Host processing outcome for:', { 
        currentPromptIndex, 
        playerId: strategy.playerId, 
        playerName: player?.name 
      });
      
      if (player) {
        const survived = narrativeText.includes('SURVIVED');
        const scoreGained = survived ? 10 : 0;
        
        const outcome: PlayerOutcome = {
          playerId: strategy.playerId,
          playerName: player.name,
          strategy: strategy.text,
          narrative: narrativeText.replace(/(SURVIVED|DIED)$/, '').trim(),
          imagePrompt: `A dramatic survival scene: ${narrativeText.slice(0, 100)}`,
          attemptImageUrl: attemptImageUrl || '',
          imageUrl: outcomeImageUrl || '',
          audioUrl: getTTSUrl(narrativeText),
          survived,
          scoreGained,
        };
        
        console.log('🎭 Host generated outcome:', outcome);
        setGeneratedOutcomes(prev => [...prev, outcome]);
        
        // Mark this outcome as processed
        setProcessedOutcomes(prev => new Set([...prev, currentPromptIndex]));
        
        // Add to game state
        addOutcome({
          playerId: strategy.playerId,
          text: outcome.narrative,
          attemptImageUrl: outcome.attemptImageUrl,
          imageUrl: outcome.imageUrl,
          audioUrl: getTTSUrl(outcome.narrative),
          survived,
          score: scoreGained,
        });
        
        // Update player score
        updatePlayer(strategy.playerId, {
          score: player.score + scoreGained
        });
        
        // Broadcast complete outcome to all players
        sendMessage({
          type: 'outcome_broadcast',
          data: {
            playerId: strategy.playerId,
            text: outcome.narrative,
            attemptImageUrl: outcome.attemptImageUrl,
            imageUrl: outcome.imageUrl,
            audioUrl: getTTSUrl(outcome.narrative),
            survived,
            score: scoreGained,
            // Include complete outcome data for synchronization
            completeOutcome: outcome
          }
        });
        
        // Move to next strategy or finish generation
        if (currentPromptIndex + 1 < strategies.length) {
          console.log('🎭 Host moving to next strategy:', currentPromptIndex + 1);
          setCurrentPromptIndex(prev => prev + 1);
        } else {
          console.log('🎭 All outcomes generated, preparing to broadcast complete set');
          setIsGenerating(false);
          
          // Wait for state to stabilize then broadcast all outcomes
          setTimeout(() => {
            const allOutcomes = [...generatedOutcomes, outcome];
            console.log('🎭 Broadcasting all outcomes ready:', allOutcomes.length, 'outcomes');
            
            sendMessage({
              type: 'all_outcomes_ready',
              data: {
                outcomes: allOutcomes,
                revealIndex: 0
              }
            });
            setCurrentRevealIndex(0);
          }, 500);
        }
      }
    }
  }, [isHost, narrativeText, outcomeImageUrl, currentPromptIndex, strategies, players, processedOutcomes, addOutcome, updatePlayer, sendMessage]);
  
  // Remove automatic revelation - let host control it
  const handleNextReveal = () => {
    if (!isHost) return;
    
    console.log('🎭 Host revealing next outcome');
    if (currentRevealIndex < generatedOutcomes.length - 1) {
      const nextIndex = currentRevealIndex + 1;
      const outcomeToReveal = generatedOutcomes[nextIndex];
      
      setCurrentRevealIndex(nextIndex);
      // Broadcast reveal command with outcome data to all players
      sendMessage({
        type: 'reveal_next',
        data: { 
          revealIndex: nextIndex,
          outcomeData: outcomeToReveal
        }
      });
    } else {
      // All outcomes revealed
      console.log('🎭 All outcomes revealed');
    }
  };

  const handleStartNewRound = () => {
    if (!isHost) return;
    
    console.log('🎭 Host starting new round from current round:', currentRound);
    
    if (currentRound < totalRounds) {
      // Host calls nextRound to update state
      nextRound();
      
      // Wait for state to update, then broadcast complete state
      setTimeout(() => {
        const state = useGameStore.getState();
        console.log('🎭 Broadcasting new round state:', {
          currentRound: state.currentRound,
          currentScenarioMakerId: state.currentScenarioMakerId,
          currentPhase: state.currentPhase,
          playersCount: state.players.length,
          allPlayers: state.players.map(p => ({ id: p.id, name: p.name, isConnected: p.isConnected }))
        });
        
        // Find the scenario maker details
        const scenarioMaker = state.players.find(p => p.id === state.currentScenarioMakerId);
        console.log('🎭 New scenario maker details:', {
          id: state.currentScenarioMakerId,
          name: scenarioMaker?.name || 'Unknown',
          exists: !!scenarioMaker
        });
        
        // Send comprehensive game state sync first
        sendMessage({
          type: 'game_state_sync',
          data: {
            currentRound: state.currentRound,
            currentScenarioMakerId: state.currentScenarioMakerId,
            currentPhase: state.currentPhase,
            scenarioText: '',
            scenarioImageUrl: null,
            resetTimer: true,
            // Include all players to ensure scenario maker is known
            players: state.players
          }
        });
        
        // Also send specific start new round message
        sendMessage({
          type: 'start_new_round',
          data: { 
            newRound: state.currentRound,
            newScenarioMaker: state.currentScenarioMakerId,
            newScenarioMakerName: scenarioMaker?.name || 'Unknown'
          }
        });
      }, 200);
    } else {
      console.log('🎭 Game complete, moving to results');
      setPhase('results');
      sendMessage({
        type: 'phase_change',
        data: { newPhase: 'results' }
      });
    }
  };

  // Listen for host commands and outcome data
  useEffect(() => {
    const handleRevealNext = (event: any) => {
      console.log('🎭 Received reveal next event:', event.detail);
      setCurrentRevealIndex(event.detail.revealIndex);
    };
    
    const handleOutcomeReceived = (event: any) => {
      console.log('🎭 Received outcome data:', event.detail.outcome);
      setGeneratedOutcomes(prev => {
        const exists = prev.find(o => o.playerId === event.detail.outcome.playerId);
        if (exists) return prev;
        return [...prev, event.detail.outcome];
      });
      if (event.detail.outcome.audioUrl) {
        const a = new Audio(event.detail.outcome.audioUrl);
        a.play().catch(() => {});
      }
    };
    
    const handleAllOutcomesReady = (event: any) => {
      console.log('🎭 Received all outcomes ready:', event.detail);
      const { outcomes, revealIndex } = event.detail;
      console.log('🎭 Setting outcomes for non-host player:', outcomes.length, 'outcomes');
      
      // Ensure all outcomes are added to the game store
      outcomes.forEach((outcome: PlayerOutcome) => {
        addOutcome({
          playerId: outcome.playerId,
          text: outcome.narrative,
          attemptImageUrl: outcome.attemptImageUrl,
          imageUrl: outcome.imageUrl,
          audioUrl: getTTSUrl(outcome.narrative),
          survived: outcome.survived,
          score: outcome.scoreGained,
        });
      });

      if (outcomes[0]?.audioUrl) {
        const a = new Audio(outcomes[0].audioUrl);
        a.play().catch(() => {});
      }
      
      setGeneratedOutcomes(outcomes);
      setCurrentRevealIndex(revealIndex);
      setIsGenerating(false);
    };
    
    window.addEventListener('revealNext', handleRevealNext);
    window.addEventListener('outcomeReceived', handleOutcomeReceived);
    window.addEventListener('allOutcomesReady', handleAllOutcomesReady);
    
    return () => {
      window.removeEventListener('revealNext', handleRevealNext);
      window.removeEventListener('outcomeReceived', handleOutcomeReceived);
      window.removeEventListener('allOutcomesReady', handleAllOutcomesReady);
    };
  }, []);
  
  // Remove the old auto-advance logic and replace with host-controlled logic
  
  if (isGenerating || (!isHost && generatedOutcomes.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="card text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-6">
            {isHost ? "Determining Fates..." : "Waiting for Host to Generate Outcomes..."}
          </h2>
          <div className="animate-pulse-slow mb-6">
            <div className="w-20 h-20 bg-purple-600 rounded-full mx-auto"></div>
          </div>
          <p className="text-gray-400 mb-4">
            {isHost 
              ? "The AI is analyzing each strategy and determining who survives..."
              : "The host is working with the AI to determine everyone's fate..."
            }
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
              {currentOutcome.attemptImageUrl && (
                <img
                  src={currentOutcome.attemptImageUrl}
                  alt="Attempt illustration"
                  className="w-full rounded-lg mb-4"
                />
              )}
              {currentOutcome.imageUrl && (
                <img
                  src={currentOutcome.imageUrl}
                  alt="Outcome illustration"
                  className="w-full rounded-lg"
                />
              )}
              <AudioPlayer src={currentOutcome.audioUrl} label="🔊 Listen" />
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
          
          {isHost ? (
            <div className="space-y-4">
              {currentRevealIndex < generatedOutcomes.length - 1 ? (
                <button
                  onClick={handleNextReveal}
                  className="btn-primary"
                >
                  Reveal Next Player
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-400 mb-4">All fates revealed!</p>
                  {currentRound < totalRounds ? (
                    <button
                      onClick={handleStartNewRound}
                      className="btn-primary"
                    >
                      Start Round {currentRound + 1}
                    </button>
                  ) : (
                    <button
                      onClick={handleStartNewRound}
                      className="btn-primary"
                    >
                      View Final Results
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400">
              <p>Waiting for host to continue...</p>
              {currentRevealIndex < generatedOutcomes.length - 1 ? (
                <p className="text-sm">({generatedOutcomes.length - currentRevealIndex - 1} more revelations)</p>
              ) : (
                <p className="text-sm">Ready for next round</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
