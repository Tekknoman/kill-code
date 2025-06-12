import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';
import { useGameStore } from '../store/gameStore';
import { setRoomIdInUrl } from '../utils/gameState';

export interface WebRTCMessage {
    type: 'scenario_broadcast' | 'strategy_submission' | 'outcome_broadcast' | 'score_update' | 'game_state' | 'player_joined' | 'player_left' | 'host_status' | 'game_state_sync' | 'rejoin_request' | 'ping' | 'pong' | 'timer_start' | 'timer_sync' | 'phase_change' | 'reveal_next' | 'start_new_round' | 'all_outcomes_ready';
    data: any;
    timestamp: number;
    senderId: string;
}

interface UseWebRTCReturn {
    connect: (roomId: string, isHost: boolean, playerName: string, playerId: string) => void;
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

    const connectionsRef = useRef<Map<string, any>>(new Map());
    const peerToPlayerMap = useRef<Map<string, string>>(new Map()); // Maps PeerJS ID to persistent player ID

    const {
        setConnection,
        setHost,
        addPlayer,
        removePlayer,
        setScenario,
        addStrategy,
        addOutcome,
        updatePlayer,
        setPhase,
        setScenarioMaker
    } = useGameStore();

    const sendMessage = (message: Omit<WebRTCMessage, 'timestamp' | 'senderId'>) => {
        const { currentPlayerId } = useGameStore.getState();
        const fullMessage: WebRTCMessage = {
            ...message,
            timestamp: Date.now(),
            senderId: currentPlayerId,
        };

        console.log('📤 Attempting to send message to', connectionsRef.current.size, 'connections:', fullMessage);

        if (connectionsRef.current.size === 0) {
            console.warn('⚠️ No connections available to send message to!');
            return;
        }

        let successCount = 0;
        let failureCount = 0;

        // Send to all connected peers
        connectionsRef.current.forEach((conn, peerId) => {
            console.log('📤 Checking connection to peer:', peerId, {
                open: conn.open,
                readyState: conn.readyState
            });

            if (conn.open) {
                try {
                    console.log('📤 Sending to peer:', peerId);
                    conn.send(fullMessage);
                    successCount++;
                } catch (err) {
                    console.error('❌ Error sending message to', peerId, ':', err);
                    failureCount++;
                }
            } else {
                console.warn('⚠️ Connection to', peerId, 'is not open, state:', conn.readyState);
                failureCount++;
            }
        });

        console.log('📤 Message sent - Success:', successCount, 'Failed:', failureCount);
    };

    const handleMessage = (message: WebRTCMessage) => {
        console.log('Received message:', message);

        switch (message.type) {
            case 'scenario_broadcast':
                setScenario(message.data.text, message.data.imageUrl, message.data.audioUrl);
                // Also update phase for non-host players
                setPhase('strategy');
                console.log('Scenario received, switching to strategy phase');
                break;

            case 'strategy_submission':
                addStrategy(message.data);
                break;

            case 'outcome_broadcast':
                console.log('🎭 Received outcome broadcast:', message.data);
                addOutcome(message.data);

                // If this includes complete outcome data, sync it to local state
                if (message.data.completeOutcome) {
                    window.dispatchEvent(new CustomEvent('outcomeReceived', {
                        detail: { outcome: message.data.completeOutcome }
                    }));
                }
                break;

            case 'score_update':
                updatePlayer(message.data.playerId, { score: message.data.score });
                break;

            case 'player_joined':
                console.log('Player joined message received:', message.data);
                const { players } = useGameStore.getState();
                const existingPlayer = players.find(p => p.id === message.data.id);

                if (existingPlayer) {
                    console.log('🔄 Player reconnecting:', message.data.id, message.data.name);
                    // Update existing player's connection status
                    updatePlayer(message.data.id, {
                        isConnected: true,
                        name: message.data.name // Update name in case it changed
                    });

                    // Send current game state to reconnecting player
                    const { currentPhase, currentScenarioMakerId, scenarioText, scenarioImageUrl } = useGameStore.getState();
                    setTimeout(() => {
                        console.log('📡 Sending game state to reconnecting player:', message.data.id);
                        sendMessage({
                            type: 'game_state_sync',
                            data: {
                                currentPhase,
                                scenarioMakerId: currentScenarioMakerId,
                                scenarioText: scenarioText,
                                scenarioImageUrl: scenarioImageUrl
                            }
                        });
                    }, 500);
                } else {
                    console.log('➕ New player joining:', message.data.id, message.data.name);
                    addPlayer(message.data);
                }
                break;

            case 'player_left':
                removePlayer(message.data.playerId);
                break;

            case 'game_state_sync':
                // Comprehensive game state sync
                console.log('🎭 Syncing game state:', message.data);

                if (message.data.currentPhase) {
                    console.log('🎭 Updating phase to:', message.data.currentPhase);
                    setPhase(message.data.currentPhase);
                }
                if (message.data.currentScenarioMakerId) {
                    console.log('🎭 Updating scenario maker to:', message.data.currentScenarioMakerId);
                    setScenarioMaker(message.data.currentScenarioMakerId);
                }
                if (message.data.scenarioMakerId) {
                    console.log('🎭 Updating scenario maker (legacy) to:', message.data.scenarioMakerId);
                    setScenarioMaker(message.data.scenarioMakerId);
                }
                if (message.data.scenarioText) {
                    console.log('🎭 Updating scenario text');
                    setScenario(message.data.scenarioText, message.data.scenarioImageUrl);
                }
                if (message.data.currentRound !== undefined) {
                    console.log('🎭 Updating round to:', message.data.currentRound);
                    useGameStore.setState({ currentRound: message.data.currentRound });
                }
                if (message.data.players) {
                    console.log('🎭 Syncing players from host');
                    // Update players to match host state
                    message.data.players.forEach((player: any) => {
                        const existingPlayer = useGameStore.getState().players.find(p => p.id === player.id);
                        if (existingPlayer) {
                            updatePlayer(player.id, player);
                        }
                    });
                }
                if (message.data.resetTimer) {
                    console.log('🎭 Resetting timer');
                    const { setTimer } = useGameStore.getState();
                    setTimer(0, false);
                }
                break;

            case 'ping':
                console.log('🏓 Received ping from:', message.senderId);
                sendMessage({
                    type: 'pong',
                    data: { timestamp: Date.now(), originalTimestamp: message.data.timestamp }
                });
                break;

            case 'pong':
                console.log('🏓 Received pong from:', message.senderId, 'latency:', Date.now() - message.data.originalTimestamp, 'ms');
                break;

            case 'timer_start':
                console.log('🕒 Received timer start:', message.data);
                const { duration, startTime } = message.data;
                const elapsed = Math.max(0, (Date.now() - startTime) / 1000);
                const remainingTime = Math.max(0, duration - elapsed);
                const { setTimer } = useGameStore.getState();
                setTimer(Math.floor(remainingTime), true);
                break;

            case 'phase_change':
                console.log('🎭 Received phase change:', message.data.newPhase);
                setPhase(message.data.newPhase);
                break;

            case 'timer_sync':
                console.log('🕒 Received timer sync:', message.data);
                const { setTimer: setTimerSync } = useGameStore.getState();
                setTimerSync(message.data.timeRemaining, message.data.isActive);
                break;

            case 'reveal_next':
                console.log('🎭 Received reveal next command:', message.data);
                window.dispatchEvent(new CustomEvent('revealNext', {
                    detail: {
                        revealIndex: message.data.revealIndex,
                        outcomeData: message.data.outcomeData
                    }
                }));
                break;

            case 'start_new_round':
                console.log('🎮 Received start new round command:', {
                    newRound: message.data.newRound,
                    newScenarioMaker: message.data.newScenarioMaker,
                    newScenarioMakerName: message.data.newScenarioMakerName
                });
                // Don't call nextRound() here - just wait for game_state_sync
                // The game_state_sync message should handle the state update
                break;

            case 'all_outcomes_ready':
                console.log('🎭 Received all outcomes ready:', message.data);
                window.dispatchEvent(new CustomEvent('allOutcomesReady', {
                    detail: {
                        outcomes: message.data.outcomes,
                        revealIndex: message.data.revealIndex
                    }
                }));
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    };

    const setupConnection = (conn: any, playerId: string, playerName: string) => {
        console.log('🔗 Setting up connection with:', conn.peer, 'playerId:', playerId, 'playerName:', playerName);

        conn.on('open', () => {
            console.log('✅ Connection opened with:', conn.peer);
            console.log('✅ Connection details:', {
                peer: conn.peer,
                connectionId: conn.connectionId,
                readyState: conn.readyState,
                open: conn.open,
                metadata: conn.metadata
            });
            console.log('🔗 Adding to connections map. Current size:', connectionsRef.current.size);
            connectionsRef.current.set(conn.peer, conn);

            // Map PeerJS ID to persistent player ID
            peerToPlayerMap.current.set(conn.peer, playerId);
            console.log('🗺️ Mapped peer', conn.peer, 'to player', playerId);

            console.log('🔗 New connections map size:', connectionsRef.current.size);
            setIsConnected(true);
            setConnection('connected');

            // Send player joined message with proper data
            const message: WebRTCMessage = {
                type: 'player_joined',
                data: {
                    id: playerId,
                    name: playerName,
                    score: 0,
                    isConnected: true,
                },
                timestamp: Date.now(),
                senderId: playerId,
            };

            // Send directly to this connection
            if (conn.open) {
                try {
                    console.log('📤 Sending player_joined message:', message);
                    conn.send(message);
                } catch (err) {
                    console.error('❌ Error sending player_joined message:', err);
                }
            } else {
                console.warn('⚠️ Connection not open when trying to send player_joined message');
            }
        });

        conn.on('data', (data: any) => {
            try {
                const message = data as WebRTCMessage;
                console.log('📨 Received data on connection:', conn.peer, message);
                handleMessage(message);
            } catch (err) {
                console.error('❌ Error parsing message from', conn.peer, ':', err);
            }
        });

        conn.on('close', () => {
            console.log('🔌 Connection closed with:', conn.peer);
            console.log('🔌 Connection state at close:', {
                readyState: conn.readyState,
                open: conn.open,
                peer: conn.peer,
                connectionId: conn.connectionId,
                metadata: conn.metadata
            });
            console.log('🔌 Total connections before removal:', connectionsRef.current.size);
            connectionsRef.current.delete(conn.peer);

            // Clean up peer-to-player mapping
            const disconnectedPlayerId = peerToPlayerMap.current.get(conn.peer);
            if (disconnectedPlayerId) {
                console.log('🗺️ Removing mapping for peer', conn.peer, 'player', disconnectedPlayerId);
                peerToPlayerMap.current.delete(conn.peer);
                // Mark player as disconnected but don't remove them (they might reconnect)
                updatePlayer(disconnectedPlayerId, { isConnected: false });
            }

            console.log('🔌 Total connections after removal:', connectionsRef.current.size);

            if (connectionsRef.current.size === 0) {
                console.log('🔌 No connections left, setting disconnected');
                setIsConnected(false);
                setConnection('disconnected');
            }
        });

        conn.on('error', (err: any) => {
            console.error('❌ Connection error with', conn.peer, ':', err);
            console.error('❌ Error details:', {
                type: err.type,
                message: err.message,
                stack: err.stack
            });
            setError(err.message);
        });
    };

    const connect = (roomIdOrPeerId: string, hostMode: boolean, playerName: string, playerId: string) => {
        console.log('🚀 Starting connection process:', { roomIdOrPeerId, hostMode, playerName, playerId });

        try {
            setError(null);
            setIsConnecting(true);
            setConnection('connecting');
            setHost(hostMode);

            // Let PeerJS generate its own random ID to avoid conflicts
            console.log('🔧 Creating new Peer (PeerJS will generate random ID)');
            console.log('🆔 Persistent player ID:', playerId);
            const newPeer = new Peer({
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
                    // Host: generate a short room code and use it as the PeerJS ID with a prefix
                    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
                    let shortCode = '';
                    for (let i = 0; i < 6; i++) {
                        shortCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }

                    // Close current peer and create a new one with the room code as ID
                    newPeer.destroy();

                    const roomPeerId = `room_${shortCode}`;
                    console.log(`Creating room peer with ID: ${roomPeerId}`);

                    const roomPeer = new Peer(roomPeerId, {
                        debug: 2,
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

                    roomPeer.on('open', (roomId) => {
                        console.log(`Room created! Code: ${shortCode}, Peer ID: ${roomId}`);
                        setPeer(roomPeer);
                        setRoomId(shortCode);
                        setRoomIdInUrl(shortCode);
                        setIsConnected(true);
                        setConnection('connected');

                        // Send host status to new connections
                        setTimeout(() => {
                            sendMessage({
                                type: 'host_status',
                                data: {
                                    hostPlayerId: playerId,
                                    isHost: true
                                }
                            });
                        }, 100);
                    });

                    roomPeer.on('connection', (conn) => {
                        console.log('Incoming connection from:', conn.peer);
                        setupConnection(conn, playerId, playerName);
                    });

                    roomPeer.on('error', (err) => {
                        console.error('Room peer error:', err);
                        setError(err.message);
                        setIsConnecting(false);
                        setConnection('disconnected');
                    });
                } else {
                    // Guest: connect to room using the room code
                    const roomPeerId = `room_${roomIdOrPeerId}`;
                    console.log(`Connecting to room peer ID: ${roomPeerId}`);

                    const conn = newPeer.connect(roomPeerId);
                    setupConnection(conn, playerId, playerName);
                    setRoomId(roomIdOrPeerId);
                }
            });

            newPeer.on('connection', (conn) => {
                console.log('Incoming connection from:', conn.peer);
                setupConnection(conn, playerId, playerName);
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
        console.log('🔌 Disconnecting...', {
            hasPeer: !!peer,
            connectionCount: connectionsRef.current.size,
            isConnected
        });

        if (peer && !peer.destroyed) {
            console.log('🔌 Destroying peer:', peer.id);
            peer.destroy();
            setPeer(null);
        }

        if (connectionsRef.current.size > 0) {
            console.log('🔌 Closing', connectionsRef.current.size, 'connections');
            connectionsRef.current.forEach(conn => {
                if (conn.open) {
                    conn.close();
                }
            });
            connectionsRef.current.clear();
        }

        // Clear peer-to-player mapping
        peerToPlayerMap.current.clear();

        setIsConnected(false);
        setConnection('disconnected');
        setRoomId('');
        console.log('🔌 Disconnect complete');
    };

    const pingConnections = useCallback(() => {
        console.log('🏓 Pinging', connectionsRef.current.size, 'connections');
        sendMessage({
            type: 'ping',
            data: { timestamp: Date.now() }
        });
    }, []);

    const checkConnectionHealth = useCallback(() => {
        const deadConnections: string[] = [];
        connectionsRef.current.forEach((conn, peerId) => {
            console.log('🩺 Checking connection health for:', peerId, {
                open: conn.open,
                readyState: conn.readyState
            });
            if (!conn.open) {
                deadConnections.push(peerId);
            }
        });

        deadConnections.forEach(peerId => {
            console.log('💀 Removing dead connection:', peerId);
            connectionsRef.current.delete(peerId);
        });

        if (deadConnections.length > 0) {
            console.log('🔌 Updated connection count:', connectionsRef.current.size);
            if (connectionsRef.current.size === 0) {
                setIsConnected(false);
                setConnection('disconnected');
            }
        }
    }, []);

    // Auto-reconnection logic
    const attemptReconnection = useCallback((roomId: string, hostMode: boolean, playerName: string, playerId: string) => {
        console.log('🔄 Attempting reconnection...', { roomId, hostMode, playerName, playerId });
        if (!isConnecting && !isConnected) {
            setTimeout(() => {
                connect(roomId, hostMode, playerName, playerId);
            }, 2000); // Wait 2 seconds before reconnecting
        }
    }, [isConnecting, isConnected]);

    // Monitor connection drops and attempt reconnection
    useEffect(() => {
        if (!isConnected && connectionsRef.current.size === 0 && roomId && !isConnecting) {
            const { currentPlayerId, players, isHost } = useGameStore.getState();
            const currentPlayer = players.find(p => p.id === currentPlayerId);
            if (currentPlayerId && currentPlayer?.name) {
                console.log('🔍 Connection lost, attempting reconnection in 3 seconds...');
                setTimeout(() => {
                    attemptReconnection(roomId, isHost, currentPlayer.name, currentPlayerId);
                }, 3000);
            }
        }
    }, [isConnected, roomId, isConnecting, attemptReconnection]);

    // Set up periodic health checks and pings
    useEffect(() => {
        const pingInterval = setInterval(pingConnections, 15000); // Ping every 15 seconds
        const healthInterval = setInterval(checkConnectionHealth, 5000); // Check health every 5 seconds

        return () => {
            clearInterval(pingInterval);
            clearInterval(healthInterval);
        };
    }, [pingConnections, checkConnectionHealth]);

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
