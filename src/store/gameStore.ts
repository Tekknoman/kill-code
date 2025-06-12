import { create } from 'zustand';
import { saveGameState, getGameState, clearGameState } from '../utils/gameState';
import { getOrCreatePlayerId } from '../utils/playerId';

export interface Player {
    id: string;
    name: string;
    score: number;
    isConnected: boolean;
}

export interface Strategy {
    playerId: string;
    text: string;
    submittedAt: number;
}

export interface Outcome {
    playerId: string;
    text: string;
    imageUrl?: string;
    audioUrl?: string;
    survived: boolean;
    score: number;
}

export type GamePhase = 'lobby' | 'scenario' | 'strategy' | 'outcomes' | 'results';

export interface GameState {
    // Game settings
    isHost: boolean;
    roomId: string;
    maxPlayers: number;
    scenarioTimeLimit: number;
    strategyTimeLimit: number;

    // Players
    players: Player[];
    currentPlayerId: string;

    // Game state
    currentRound: number;
    totalRounds: number;
    currentPhase: GamePhase;
    currentScenarioMakerId: string;

    // Timer
    timeRemaining: number;
    isTimerActive: boolean;

    // Current round data
    scenarioText: string;
    scenarioImageUrl?: string;
    scenarioAudioUrl?: string;
    strategies: Strategy[];
    outcomes: Outcome[];

    // WebRTC connection
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected';

    // Actions
    setGameSettings: (settings: Partial<Pick<GameState, 'maxPlayers' | 'scenarioTimeLimit' | 'strategyTimeLimit' | 'totalRounds'>>) => void;
    setHost: (isHost: boolean) => void;
    addPlayer: (player: Player) => void;
    removePlayer: (playerId: string) => void;
    updatePlayer: (playerId: string, updates: Partial<Player>) => void;
    setCurrentPlayer: (playerId: string) => void;

    setPhase: (phase: GamePhase) => void;
    setScenarioMaker: (playerId: string) => void;
    nextRound: () => void;

    setTimer: (seconds: number, active: boolean) => void;
    decrementTimer: () => void;

    setScenario: (text: string, imageUrl?: string, audioUrl?: string) => void;
    addStrategy: (strategy: Strategy) => void;
    clearStrategies: () => void;
    addOutcome: (outcome: Outcome) => void;
    clearOutcomes: () => void;

    setConnection: (status: 'disconnected' | 'connecting' | 'connected') => void;

    // Persistence and synchronization
    saveCurrentState: () => void;
    loadSavedState: () => boolean;
    clearSavedState: () => void;
    syncGameState: (state: Partial<GameState>) => void;

    resetGame: () => void;
}

const initialState = {
    isHost: false,
    roomId: '',
    maxPlayers: 6,
    scenarioTimeLimit: 120,
    strategyTimeLimit: 90,

    players: [],
    currentPlayerId: getOrCreatePlayerId(), // Use persistent UUID instead of random

    currentRound: 1,
    totalRounds: 5,
    currentPhase: 'lobby' as GamePhase,
    currentScenarioMakerId: '',

    timeRemaining: 0,
    isTimerActive: false,

    scenarioText: '',
    scenarioImageUrl: undefined,
    scenarioAudioUrl: undefined,
    strategies: [],
    outcomes: [],

    isConnected: false,
    connectionStatus: 'disconnected' as const,
};

export const useGameStore = create<GameState>((set) => ({
    ...initialState,

    setGameSettings: (settings) => set((state) => ({ ...state, ...settings })),

    setHost: (isHost) => set((state) => ({ ...state, isHost })),

    addPlayer: (player) => set((state) => ({
        players: [...state.players, player]
    })),

    removePlayer: (playerId) => set((state) => ({
        players: state.players.filter(p => p.id !== playerId)
    })),

    updatePlayer: (playerId, updates) => set((state) => ({
        players: state.players.map(p =>
            p.id === playerId ? { ...p, ...updates } : p
        )
    })),

    setCurrentPlayer: (playerId) => set({ currentPlayerId: playerId }),

    setPhase: (phase) => set({ currentPhase: phase }),

    setScenarioMaker: (playerId) => set({ currentScenarioMakerId: playerId }),

    nextRound: () => set((state) => {
        const nextRound = state.currentRound + 1;
        const players = state.players.filter(p => p.isConnected);
        const currentMakerIndex = players.findIndex(p => p.id === state.currentScenarioMakerId);
        const nextMakerIndex = (currentMakerIndex + 1) % players.length;
        const nextScenarioMaker = players[nextMakerIndex]?.id || '';

        return {
            currentRound: nextRound,
            currentScenarioMakerId: nextScenarioMaker,
            currentPhase: nextRound <= state.totalRounds ? 'scenario' : 'results',
            scenarioText: '',
            scenarioImageUrl: undefined,
            scenarioAudioUrl: undefined,
            strategies: [],
            outcomes: [],
        };
    }),

    setTimer: (seconds, active) => set({
        timeRemaining: seconds,
        isTimerActive: active
    }),

    decrementTimer: () => set((state) => {
        const newTime = Math.max(0, state.timeRemaining - 1);
        return {
            timeRemaining: newTime,
            isTimerActive: newTime > 0 && state.isTimerActive
        };
    }),

    setScenario: (text, imageUrl, audioUrl) => set({
        scenarioText: text,
        scenarioImageUrl: imageUrl,
        scenarioAudioUrl: audioUrl,
    }),

    addStrategy: (strategy) => {
        console.log('📝 Adding strategy to store:', strategy);
        return set((state) => {
            const existingStrategy = state.strategies.find(s => s.playerId === strategy.playerId);
            if (existingStrategy) {
                console.log('⚠️ Strategy already exists for player:', strategy.playerId);
                return state; // Don't add duplicate
            }
            console.log('✅ Strategy added successfully. Total strategies:', state.strategies.length + 1);
            return {
                strategies: [...state.strategies, strategy]
            };
        });
    },

    clearStrategies: () => set({ strategies: [] }),

    addOutcome: (outcome) => set((state) => ({
        outcomes: [...state.outcomes, outcome]
    })),

    clearOutcomes: () => set({ outcomes: [] }),

    setConnection: (status) => set({
        connectionStatus: status,
        isConnected: status === 'connected'
    }),

    // Persistence and synchronization
    saveCurrentState: () => {
        const state = useGameStore.getState();
        saveGameState({
            playerId: state.currentPlayerId,
            playerName: state.players.find(p => p.id === state.currentPlayerId)?.name || '',
            roomId: state.roomId,
            isHost: state.isHost,
            players: state.players,
            currentPhase: state.currentPhase,
            currentRound: state.currentRound,
            totalRounds: state.totalRounds,
            scenarioText: state.scenarioText,
            scenarioImageUrl: state.scenarioImageUrl,
            strategies: state.strategies,
            outcomes: state.outcomes,
        });
    },

    loadSavedState: () => {
        const savedState = getGameState();
        if (savedState) {
            set({
                currentPlayerId: savedState.playerId,
                roomId: savedState.roomId,
                isHost: savedState.isHost,
                players: savedState.players,
                currentPhase: savedState.currentPhase as GamePhase,
                currentRound: savedState.currentRound,
                totalRounds: savedState.totalRounds,
                scenarioText: savedState.scenarioText || '',
                scenarioImageUrl: savedState.scenarioImageUrl,
                strategies: savedState.strategies,
                outcomes: savedState.outcomes,
            });
            return true;
        }
        return false;
    },

    clearSavedState: () => {
        clearGameState();
    },

    syncGameState: (updates) => set((state) => {
        const newState = { ...state, ...updates };
        // Auto-save when syncing
        setTimeout(() => {
            useGameStore.getState().saveCurrentState();
        }, 0);
        return newState;
    }),

    resetGame: () => {
        clearGameState();
        set(initialState);
    },
}));
