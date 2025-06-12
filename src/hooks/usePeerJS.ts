import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { useGameStore } from '../store/gameStore';

export interface WebRTCMessage {
    type: 'scenario_broadcast' | 'strategy_submission' | 'outcome_broadcast' | 'score_update' | 'game_state' | 'player_joined' | 'player_left' | 'host_status';
    data: any;
    timestamp: number;
    senderId: string;
}

interface UseWebRTCReturn {
    connect: (roomId: string, isHost: boolean, playerName: string) => void;
    disconnect: () => void;
    sendMessage: (message: Omit<WebRTCMessage, 'timestamp' | 'senderId'>) => void;
    isConnected: boolean;
    error: string | null;
    roomId: string;
    isConnecting: boolean;
}

export const useWebRTC = (): UseWebRTCReturn => {
    const [peer, setPeer] = useState<Peer | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roomId, setRoomId] = useState<string>('');
    const [currentPlayerName, setCurrentPlayerName] = useState<string>('');

    const connectionsRef = useRef<Map<string, any>>(new Map());

    const {
        currentPlayerId,
        setConnection,
        setHost,
        addPlayer,
        removePlayer,
        setScenario,
        addStrategy,
        addOutcome,
        updatePlayer
    } = useGameStore();

    const sendMessage = (message: Omit<WebRTCMessage, 'timestamp' | 'senderId'>) => {
        const fullMessage: WebRTCMessage = {
            ...message,
            timestamp: Date.now(),
            senderId: currentPlayerId,
        };

        // Send to all connected peers
        connectionsRef.current.forEach((conn) => {
            if (conn.open) {
                try {
                    conn.send(fullMessage);
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

            case 'host_status':
                // Update which player is the host
                if (message.data.hostPlayerId) {
                    // For now, we'll just log this - in a more complex implementation
                    // we might want to track host status per player
                    console.log('Host player:', message.data.hostPlayerId);
                }
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    };

    const setupConnection = (conn: any) => {
        conn.on('open', () => {
            console.log('Connection opened with:', conn.peer);
            connectionsRef.current.set(conn.peer, conn);
            setIsConnected(true);
            setConnection('connected');

            // Send player joined message
            sendMessage({
                type: 'player_joined',
                data: {
                    id: currentPlayerId,
                    name: currentPlayerName,
                    score: 0,
                    isConnected: true,
                }
            });
        });

        conn.on('data', (data: any) => {
            try {
                const message = data as WebRTCMessage;
                handleMessage(message);
            } catch (err) {
                console.error('Error parsing message:', err);
            }
        });

        conn.on('close', () => {
            console.log('Connection closed with:', conn.peer);
            connectionsRef.current.delete(conn.peer);

            if (connectionsRef.current.size === 0) {
                setIsConnected(false);
                setConnection('disconnected');
            }
        });

        conn.on('error', (err: any) => {
            console.error('Connection error with', conn.peer, ':', err);
            setError(err.message);
        });
    };

    const connect = (roomIdOrPeerId: string, hostMode: boolean, playerName: string) => {
        try {
            setError(null);
            setIsConnecting(true);
            setConnection('connecting');
            setHost(hostMode); // Set host status in the store
            setCurrentPlayerName(playerName); // Store player name for later use

            // Create a new peer with the current player ID as the peer ID
            const newPeer = new Peer(currentPlayerId, {
                debug: 2, // Enable debug logs
                config: {
                    iceServers: [
                        {
                            urls: "stun:stun.relay.metered.ca:80",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:80",
                            username: "87e4a5ce35bbbbdc74c00858",
                            credential: "uK8dSnF7Tu9NdpJh",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:80?transport=tcp",
                            username: "87e4a5ce35bbbbdc74c00858",
                            credential: "uK8dSnF7Tu9NdpJh",
                        },
                        {
                            urls: "turn:global.relay.metered.ca:443",
                            username: "87e4a5ce35bbbbdc74c00858",
                            credential: "uK8dSnF7Tu9NdpJh",
                        },
                        {
                            urls: "turns:global.relay.metered.ca:443?transport=tcp",
                            username: "87e4a5ce35bbbbdc74c00858",
                            credential: "uK8dSnF7Tu9NdpJh",
                        },
                    ]
                }
            });

            newPeer.on('open', (id) => {
                console.log('Peer opened with ID:', id);
                setPeer(newPeer);
                setIsConnecting(false);

                if (hostMode) {
                    // Host: generate a short room code and map it to the peer ID
                    // Use only letters and numbers, excluding easily confused characters (0, O, I, 1)
                    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
                    let shortCode = '';
                    for (let i = 0; i < 6; i++) {
                        shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    setRoomId(shortCode);

                    // Store the mapping in localStorage (in production, use a database)
                    localStorage.setItem(`room_${shortCode}`, id);

                    console.log(`Room created! Code: ${shortCode}, Peer ID: ${id}`);

                    setIsConnected(true);
                    setConnection('connected');

                    // Send host status to new connections
                    setTimeout(() => {
                        sendMessage({
                            type: 'host_status',
                            data: {
                                hostPlayerId: currentPlayerId,
                                isHost: true
                            }
                        });
                    }, 100);
                } else {
                    // Guest: use the room code to find the host's peer ID
                    const hostPeerId = localStorage.getItem(`room_${roomIdOrPeerId}`);

                    if (hostPeerId) {
                        console.log(`Connecting to host with peer ID: ${hostPeerId}`);
                        const conn = newPeer.connect(hostPeerId);
                        setupConnection(conn);
                        setRoomId(roomIdOrPeerId);
                    } else {
                        setError(`Room "${roomIdOrPeerId}" not found. Please check the room code.`);
                        setIsConnecting(false);
                        setConnection('disconnected');
                    }
                }
            });

            newPeer.on('connection', (conn) => {
                console.log('Incoming connection from:', conn.peer);
                setupConnection(conn);
            });

            newPeer.on('error', (err) => {
                console.error('Peer error:', err);
                setError(`Connection failed: ${err.message}`);
                setIsConnecting(false);
                setConnection('disconnected');
            });

            newPeer.on('disconnected', () => {
                console.log('Peer disconnected');
                setConnection('disconnected');
                setIsConnected(false);
                setIsConnecting(false);
            });

        } catch (err) {
            console.error('Connection error:', err);
            setError(err instanceof Error ? err.message : 'Unknown connection error');
            setIsConnecting(false);
            setConnection('disconnected');
        }
    };

    const disconnect = () => {
        if (peer) {
            peer.destroy();
            setPeer(null);
        }

        connectionsRef.current.forEach(conn => conn.close());
        connectionsRef.current.clear();

        setIsConnected(false);
        setConnection('disconnected');
        setRoomId('');
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
        isConnecting,
        error,
        roomId,
    };
};
