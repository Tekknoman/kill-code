# Communication Architecture

This document outlines how Kill Code synchronizes state between players using WebRTC and describes potential pitfalls.

## Overview

- **PeerJS** is used for establishing WebRTC data channels.
- The host generates a room code and becomes the connection hub.
- Guests connect to the host using `room_<code>` as the PeerJS id.
- All game data flows through these data channels, no backend is required.

## Connection Flow

1. **Host** creates a room. A PeerJS peer with id `room_<code>` is created and listens for connections.
2. **Players** connect to this id. Upon connection both sides send a `player_joined` message containing persistent player id and name.
3. Connections are stored in a map so the host can broadcast messages to everyone. Each connection maps the PeerJS id to the persistent player id.
4. Periodic `ping` / `pong` messages keep connections alive and allow removal of dead peers.
5. When a peer disconnects a `player_left` message is sent and the player is marked as disconnected, but kept in state so they may reconnect.

## Message Types

| Type | Sent By | Purpose |
| --- | --- | --- |
| `scenario_broadcast` | Scenario maker | Share scenario text and image with all players |
| `strategy_submission` | Each player | Send strategy to host; host forwards to others |
| `outcome_broadcast` | Host | Send individual outcome to players |
| `game_state_sync` | Host | Authoritative snapshot of host state |
| `timer_start` | Host | Start synchronized timer on all clients |
| `timer_sync` | Host | Periodically correct timer drift |
| `phase_change` | Host | Force all clients to a new phase |
| `reveal_next` | Host | Reveal next player's outcome |
| `start_new_round` | Host | Inform clients a new round has begun |
| `all_outcomes_ready` | Host | Broadcast all generated outcomes |
| `player_joined` / `player_left` | Host and players | Track connection status |
| `ping` / `pong` | Automatic | Connection liveness check |

## Data Flow

- The **host** is always the source of truth. It decides when phases change and which player is the current scenario maker.
- Players submit data (strategies) to the host which then broadcasts updates to everyone.
- After each significant state change the host sends a `game_state_sync` message so reconnecting clients can catch up.
- Local state is persisted in `localStorage` so a reload can recover the last known state and reconnect.

## Potential Pitfalls

- **Message Loss:** WebRTC data channels are unreliable by default. Important messages such as `scenario_broadcast` and outcomes should be resent if no acknowledgment is received.
- **Reconnection:** If the host disconnects the room is lost. Guests will need to join a new room code.
- **State Divergence:** If a guest misses a message they might end up in a different phase. Periodic `game_state_sync` messages from the host mitigate this.
- **Network Latency:** Timers are started using host time. Minor drift is corrected with `timer_sync` messages but long delays could desynchronize the experience.

## Improvements

- Implement explicit acknowledgements and retries for critical messages.
- Persist the authoritative state on the host and send it when new peers join or reconnect.
- Consider migrating heavy AI tasks solely to the host to avoid duplicated API costs.
- Keep message payloads small; compress large texts or images if necessary.

