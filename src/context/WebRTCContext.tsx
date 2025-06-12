import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useWebRTC } from '../hooks/usePeerJS';

interface WebRTCContextType {
    connect: (roomId: string, isHost: boolean, playerName: string, playerId: string) => void;
    disconnect: () => void;
    sendMessage: (message: any) => void;
    isConnected: boolean;
    isConnecting: boolean;
    error: string | null;
    roomId: string;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const WebRTCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const webrtc = useWebRTC();
    
    return (
        <WebRTCContext.Provider value={webrtc}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTCContext = (): WebRTCContextType => {
    const context = useContext(WebRTCContext);
    if (!context) {
        throw new Error('useWebRTCContext must be used within a WebRTCProvider');
    }
    return context;
};
