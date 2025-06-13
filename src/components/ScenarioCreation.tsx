import React, { useState, useEffect } from 'react';
import { usePollinationsText, usePollinationsImage } from '@pollinations/react';
import { SpeechRecognition, useSpeechRecognition } from '../utils/speechRecognition';
import { useGameStore } from '../store/gameStore';
import { useGameTimer } from '../hooks/useGameTimer';
import { useWebRTCContext } from '../context/WebRTCContext';
import { Timer } from './Timer';
import { generateTTS } from '../utils/pollinationsAudio';

export const ScenarioCreation: React.FC = () => {
  const [scenarioInput, setScenarioInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [submittedScenario, setSubmittedScenario] = useState('');
  
  const {
    currentPlayerId,
    currentScenarioMakerId,
    scenarioTimeLimit,
    setScenario,
    setPhase,
    isHost,
    currentRound,
  } = useGameStore();
  
  const { startTimer, timeRemaining, isTimerActive } = useGameTimer();
  const { sendMessage, isConnected } = useWebRTCContext();
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  const isScenarioMaker = currentPlayerId === currentScenarioMakerId;
  
  // Only generate image prompt when scenario is submitted
  const imagePrompt = usePollinationsText(
    submittedScenario ? `Convert this survival scenario into a vivid, detailed image prompt for a dramatic illustration: "${submittedScenario}"` : '',
    { 
      seed: 42,
      model: 'openai',
      systemPrompt: 'You are a creative prompt engineer specializing in dramatic survival scenarios. Create detailed, atmospheric image prompts.'
    }
  );
  
  // Generate scenario image only after prompt is ready
  const scenarioImage = usePollinationsImage(
    imagePrompt || '',
    { 
      width: 512, 
      height: 512, 
      seed: 42,
      model: 'turbo',
      nologo: true 
    }
  );
  
  // Start timer when component mounts (only scenario maker)
  useEffect(() => {
    if (isScenarioMaker && !isTimerActive) {
      console.log('🕒 Scenario maker starting timer for', scenarioTimeLimit, 'seconds');
      startTimer(scenarioTimeLimit);
      
      // Broadcast timer start to all players
      sendMessage({
        type: 'timer_start',
        data: { 
          phase: 'scenario', 
          duration: scenarioTimeLimit, 
          startTime: Date.now() 
        }
      });
    }
  }, [isScenarioMaker, isTimerActive, scenarioTimeLimit, startTimer, sendMessage]);
  
  // Auto-submit when timer expires
  useEffect(() => {
    if (isScenarioMaker && timeRemaining === 0 && scenarioInput.trim()) {
      handleSubmitScenario();
    }
  }, [timeRemaining, isScenarioMaker, scenarioInput]);
  
  // Update scenario input with speech recognition
  useEffect(() => {
    if (transcript) {
      setScenarioInput(transcript);
    }
  }, [transcript]);
  
  // Debug logging for scenario maker state
  useEffect(() => {
    console.log('🎭 ScenarioCreation state check:', {
      currentPlayerId,
      currentScenarioMakerId,
      isScenarioMaker,
      isHost,
      playerName: useGameStore.getState().players.find(p => p.id === currentPlayerId)?.name || 'Unknown'
    });
  }, [currentPlayerId, currentScenarioMakerId, isScenarioMaker, isHost]);
  
  // Reset local state when round changes
  useEffect(() => {
    console.log('🔄 ScenarioCreation: Round changed, resetting scenario input and transcript');
    setScenarioInput('');
    setSubmittedScenario('');
    resetTranscript();
  }, [currentRound]);
  
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
  
  const handleSubmitScenario = async () => {
    if (!scenarioInput.trim() || isGenerating) return;
    
    setIsGenerating(true);
    
    // Set the submitted scenario to trigger image generation
    setSubmittedScenario(scenarioInput.trim());
    
    try {
      // Wait for image to be generated
      await new Promise(resolve => {
        const checkImage = () => {
          if (scenarioImage) {
            resolve(scenarioImage);
          } else {
            setTimeout(checkImage, 100);
          }
        };
        checkImage();
      });
      
      const audioUrl = await generateTTS(scenarioInput.trim());

      // Set scenario in store
      console.log('💾 Setting scenario in store:', scenarioInput.trim());
      setScenario(scenarioInput.trim(), scenarioImage, audioUrl);
      
      // Broadcast scenario to all players
      console.log('📡 Broadcasting scenario to all players');
      console.log('📡 Connection status:', isConnected);
      console.log('📡 Scenario text:', scenarioInput.trim());
      console.log('📡 Scenario image:', scenarioImage);
      
      sendMessage({
        type: 'scenario_broadcast',
        data: {
          text: scenarioInput.trim(),
          imageUrl: scenarioImage,
          audioUrl,
        }
      });
      
      console.log('📡 Scenario broadcast message sent');
      
      // Move to strategy phase
      console.log('🔄 Moving to strategy phase');
      setPhase('strategy');
      
      // Send game state sync to ensure all players are in sync
      setTimeout(() => {
        console.log('🔄 Sending game state sync after scenario broadcast');
        sendMessage({
          type: 'game_state_sync',
          data: {
            currentPhase: 'strategy',
            scenarioMakerId: currentPlayerId
          }
        });
      }, 500);
      
    } catch (error) {
      console.error('Error submitting scenario:', error);
    } finally {
      setIsGenerating(false);
    }
  };
  
  if (!isScenarioMaker) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Timer />
          
          <div className="card text-center mt-6">
            <h2 className="text-2xl font-bold mb-4">Waiting for Scenario</h2>
            <p className="text-gray-400 mb-4">
              The scenario maker is creating a survival situation...
            </p>
            <div className="animate-pulse-slow">
              <div className="w-16 h-16 bg-purple-600 rounded-full mx-auto mb-4"></div>
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
            <h2 className="text-2xl font-bold mb-4">Create Scenario</h2>
            <p className="text-gray-400 mb-6">
              You are the scenario maker! Describe a survival situation that will challenge other players.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Survival Scenario
                </label>
                <textarea
                  value={scenarioInput}
                  onChange={(e) => setScenarioInput(e.target.value)}
                  placeholder="Describe a challenging survival scenario..."
                  className="input-field h-32 resize-none"
                  maxLength={500}
                  disabled={isGenerating}
                />
                <div className="text-right text-xs text-gray-400 mt-1">
                  {scenarioInput.length}/500
                </div>
              </div>
              
              {browserSupportsSpeechRecognition && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleStartListening}
                    disabled={listening || isGenerating}
                    className={`btn-secondary flex-1 ${listening ? 'opacity-50' : ''}`}
                  >
                    {listening ? 'Listening...' : '🎤 Speak Scenario'}
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
                onClick={handleSubmitScenario}
                disabled={!scenarioInput.trim() || isGenerating}
                className={`btn-primary w-full ${isGenerating ? 'opacity-50' : ''}`}
              >
                {isGenerating ? 'Generating...' : 'Submit Scenario'}
              </button>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-bold mb-4">Preview</h3>
            
            {scenarioInput ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Scenario Text:</h4>
                  <p className="text-gray-300 bg-gray-700 p-3 rounded">
                    {scenarioInput}
                  </p>
                </div>
                
                {scenarioImage ? (
                  <div>
                    <h4 className="font-medium mb-2">Generated Image:</h4>
                    <img
                      src={scenarioImage}
                      alt="Scenario illustration"
                      className="w-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <h4 className="font-medium mb-2">Generating Image:</h4>
                    <div className="w-full h-48 bg-gray-700 rounded-lg flex items-center justify-center">
                      <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                Start typing or speaking to see a preview
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Tip: Be creative! The more dramatic and challenging your scenario, the more exciting the game becomes.</p>
        </div>
      </div>
    </div>
  );
};
