import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import io, { Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

export interface WebRTCMessage {
    type: 'scenario_broadcast' | 'strategy_submission' | 'outcome_broadcast' | 'score_update' | 'game_state' | 'player_joined' | 'player_left';
    data: any;
    timestamp: number;
    senderId: string;
}

interface UseWebRTCReturn {
    connect: (roomId: string, isHost: boolean) => void;
    disconnect: () => void;
    sendMessage: (message: Omit<WebRTCMessage, 'timestamp' | 'senderId'>) => void;
    isConnected: boolean;
    error: string | null;
}

// For development, we'll use a simple signaling server
// In production, you'd want to use a proper signaling service
const SIGNALING_SERVER = 'ws://localhost:3001';

export const useWebRTC = (): UseWebRTCReturn => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [peers, setPeers] = useState<Map<string, Peer.Instance>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        currentPlayerId,
        setConnection,
        addPlayer,
        removePlayer,
        setScenario,
        addStrategy,
        addOutcome,
        updatePlayer
    } = useGameStore();

    const roomIdRef = useRef<string>('');

    const sendMessage = (message: Omit<WebRTCMessage, 'timestamp' | 'senderId'>) => {
        const fullMessage: WebRTCMessage = {
            ...message,
            timestamp: Date.now(),
            senderId: currentPlayerId,
        };

        // Send to all connected peers
        peers.forEach((peer) => {
            if (peer.connected) {
                try {
                    peer.send(JSON.stringify(fullMessage));
                } catch (err) {
                    console.error('Error sending message:', err);
                }
            }
        });
    };

    const handleMessage = (message: WebRTCMessage) => {
        console.log('Received message:', message);

        switch (message.type) {
            case 'scenario_broadcast':
                setScenario(message.data.text, message.data.imageUrl, message.data.audioUrl);
                break;

            case 'strategy_submission':
                addStrategy(message.data);
                break;

            case 'outcome_broadcast':
                addOutcome(message.data);
                break;

            case 'score_update':
                updatePlayer(message.data.playerId, { score: message.data.score });
                break;

            case 'player_joined':
                addPlayer(message.data);
                break;

            case 'player_left':
                removePlayer(message.data.playerId);
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    };

    const createPeer = (initiator: boolean, peerId: string) => {
        const peer = new Peer({
            initiator,
            trickle: false,
        });

        peer.on('signal', (signal) => {
            if (socket) {
                socket.emit('signal', {
                    to: peerId,
                    from: currentPlayerId,
                    signal,
                    room: roomIdRef.current,
                });
            }
        });

        peer.on('connect', () => {
            console.log('Peer connected:', peerId);
            setIsConnected(true);
            setConnection('connected');
        });

        peer.on('data', (data) => {
            try {
                const message = JSON.parse(data.toString());
                handleMessage(message);
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            setError(err.message);
        });

        peer.on('close', () => {
            console.log('Peer disconnected:', peerId);
            setPeers(prev => {
                const newPeers = new Map(prev);
                newPeers.delete(peerId);
                return newPeers;
            });
        });

        return peer;
    };

    const connect = (roomId: string, isHost: boolean) => {
        try {
            setError(null);
            setConnection('connecting');
            roomIdRef.current = roomId;

            const newSocket = io(SIGNALING_SERVER);

            newSocket.on('connect', () => {
                console.log('Connected to signaling server');
                newSocket.emit('join-room', { roomId, playerId: currentPlayerId, isHost });
            });

            newSocket.on('user-joined', ({ playerId }) => {
                console.log('User joined:', playerId);
                if (playerId !== currentPlayerId) {
                    const peer = createPeer(true, playerId);
                    setPeers(prev => new Map(prev).set(playerId, peer));
                }
            });

            newSocket.on('user-left', ({ playerId }) => {
                console.log('User left:', playerId);
                const peer = peers.get(playerId);
                if (peer) {
                    peer.destroy();
                    setPeers(prev => {
                        const newPeers = new Map(prev);
                        newPeers.delete(playerId);
                        return newPeers;
                    });
                }
                removePlayer(playerId);
            });

            newSocket.on('signal', ({ from, signal }) => {
                let peer = peers.get(from);

                if (!peer) {
                    peer = createPeer(false, from);
                    setPeers(prev => new Map(prev).set(from, peer!));
                }

                peer.signal(signal);
            });

            newSocket.on('error', (error) => {
                console.error('Socket error:', error);
                setError(error.message || 'Connection error');
                setConnection('disconnected');
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from signaling server');
                setConnection('disconnected');
                setIsConnected(false);
            });

            setSocket(newSocket);
        } catch (err) {
            console.error('Connection error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setConnection('disconnected');
        }
    };

    const disconnect = () => {
        if (socket) {
            socket.disconnect();
            setSocket(null);
        }

        peers.forEach(peer => peer.destroy());
        setPeers(new Map());

        setIsConnected(false);
        setConnection('disconnected');
    };

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, []);

    return {
        connect,
        disconnect,
        sendMessage,
        isConnected,
        error,
    };
};
