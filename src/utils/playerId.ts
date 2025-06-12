// Utility for managing persistent player IDs across reconnections

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getOrCreatePlayerId(): string {
    const PLAYER_ID_KEY = 'kill-code-player-id';

    // Try to get existing player ID from localStorage
    let playerId = localStorage.getItem(PLAYER_ID_KEY);

    if (!playerId) {
        // Generate new UUID if none exists
        playerId = generateUUID();
        localStorage.setItem(PLAYER_ID_KEY, playerId);
        console.log('🆔 Generated new player ID:', playerId);
    } else {
        console.log('🆔 Using existing player ID:', playerId);
    }

    return playerId;
}

export function clearPlayerId(): void {
    localStorage.removeItem('kill-code-player-id');
    console.log('🆔 Cleared player ID from localStorage');
}

export function getPlayerName(): string {
    return localStorage.getItem('kill-code-player-name') || '';
}

export function setPlayerName(name: string): void {
    localStorage.setItem('kill-code-player-name', name);
    console.log('👤 Saved player name:', name);
}
