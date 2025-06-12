// Game state persistence and synchronization utilities

export interface PersistedPlayer {
    id: string;
    name: string;
    score: number;
    isConnected: boolean;
}

export interface PersistedGameState {
    playerId: string;
    playerName: string;
    roomId: string;
    isHost: boolean;
    players: PersistedPlayer[];
    currentPhase: string;
    currentRound: number;
    totalRounds: number;
    scenarioText?: string;
    scenarioImageUrl?: string;
    strategies: Array<{
        playerId: string;
        text: string;
        submittedAt: number;
    }>;
    outcomes: Array<{
        playerId: string;
        text: string;
        imageUrl?: string;
        survived: boolean;
        score: number;
    }>;
}

const GAME_STATE_KEY = 'kill-code-game-state';

export const saveGameState = (state: Partial<PersistedGameState>) => {
    try {
        const existing = getGameState();
        const newState = { ...existing, ...state };
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));
    } catch (error) {
        console.error('Failed to save game state:', error);
    }
};

export const getGameState = (): PersistedGameState | null => {
    try {
        const stored = localStorage.getItem(GAME_STATE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Failed to load game state:', error);
        return null;
    }
};

export const clearGameState = () => {
    try {
        localStorage.removeItem(GAME_STATE_KEY);
    } catch (error) {
        console.error('Failed to clear game state:', error);
    }
};

export const getRoomIdFromUrl = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
};

export const setRoomIdInUrl = (roomId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.replaceState({}, '', url.toString());
};

export const clearRoomIdFromUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
};
