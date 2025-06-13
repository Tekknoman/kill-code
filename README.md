# 🎮 Kill Code - AI-Powered Survival Game

A **fully decentralized** browser game where players create survival scenarios and compete using AI-generated content. Built with React, TypeScript, Tailwind CSS, and Pollinations AI, featuring real-time multiplayer via WebRTC peer-to-peer communication.

## 🌟 Features

### ✅ **Fully Implemented**
- **🎨 AI-Generated Content**: Dynamic scenarios and images powered by Pollinations AI
- **🎤 Voice Recognition**: Speak your scenarios and strategies using Web Speech API  
- **🌐 Real-time Multiplayer**: WebRTC peer-to-peer communication with room codes
- **🏠 No Backend Required**: Fully client-side with decentralized architecture
- **📱 Persistent Sessions**: Auto-reconnection and URL-based room sharing
- **⏰ Synchronized Timers**: Host-controlled game flow with real-time sync
- **🎯 Robust State Management**: Zustand store with comprehensive multiplayer sync
- **💫 Beautiful UI**: Modern dark theme with Tailwind CSS v4

### � **Planned for Future**
- **🔊 Audio Narration**: TTS for scenarios and outcomes (UI ready, integration pending)
- **📊 Enhanced Analytics**: Game statistics and player performance tracking
- **🎪 Extended Game Modes**: Additional survival scenarios and themes

## �🚀 Getting Started

### Prerequisites

- **Node.js 18+** 
- **Modern web browser** with Speech Recognition support (Chrome/Edge recommended)
- **Internet connection** for AI content generation

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd kill-code
npm install
```

2. **Start the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to `http://localhost:5173`

## 🎯 How to Play

### 🏠 **Room Setup**
1. **Host creates room**: Enter name → "Create Room" → Share 6-character room code
2. **Players join**: Enter name + room code → "Join Room"  
3. **Auto-reconnection**: Room codes persist in URL for easy rejoining
4. **Game settings**: Host can adjust time limits and rounds

### 🎮 **Game Flow**

The game follows a **structured round-based flow** with AI-powered content:

#### **🎭 Phase 1: Scenario Creation**
- One player becomes the **scenario maker** (rotates each round)
- Create a survival scenario via **text input** or **voice recognition**
- **AI generates** a dramatic image to accompany the scenario
- Scenario is **broadcast** to all players in real-time

#### **🛡️ Phase 2: Strategy Submission**  
- All players (including scenario maker) submit survival strategies
- Input via **typing** or **voice recognition** with live transcription
- **Synchronized timer** ensures fair play across all clients
- Real-time progress tracking shows submission status

#### **🎲 Phase 3: Outcome Generation** *(Host-controlled)*
- Host generates AI-powered outcomes for each player's strategy
- **Dramatic fate determination**: Survived or Perished
- **AI-generated images** accompany each outcome
- **Sequential revelation** creates suspenseful storytelling

#### **🏆 Phase 4: Results & Scoring**
- Survivors earn points, build cumulative scores
- **New round begins** with rotated scenario maker
- Game continues for configured number of rounds

## 🛠 Technical Architecture

### **Frontend Stack**
- **React 19** + **TypeScript** for robust UI development
- **Tailwind CSS v4** for beautiful, responsive styling  
- **Zustand** for efficient, synchronized state management
- **Vite** for lightning-fast development and building

### **AI Integration**  
- **Pollinations AI** via React hooks for:
  - Scenario image generation (`usePollinationsImage`)
  - AI text processing (`usePollinationsText`)
  - Dynamic prompt engineering for dramatic content

### **Multiplayer Architecture**
- **WebRTC (PeerJS)** for real-time peer-to-peer communication
- **Decentralized design**: No signaling server required for basic functionality
- **STUN/TURN servers** for NAT traversal and connection reliability
- **Automatic reconnection** with persistent player identities

### **Key Message Types**
```typescript
'scenario_broadcast'    // Share scenario + image
'strategy_submission'   // Player survival strategies  
'outcome_broadcast'     // AI-generated fates
'game_state_sync'       // Comprehensive state synchronization
'timer_start'          // Synchronized countdown timers
'phase_change'         // Game phase transitions
'player_joined'        // Player connection events
```

## 🎤 Voice Recognition Features

- **Cross-browser support** with intelligent fallbacks
- **Live transcription** during scenario/strategy input
- **Continuous listening** mode for natural speech input  
- **Error handling** for unsupported browsers

## 🔧 Development

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production  
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### **Key Project Structure**
```
src/
├── components/          # React components for each game phase
├── hooks/              # Custom hooks (WebRTC, timers, etc.)
├── store/              # Zustand state management
├── context/            # React Context for WebRTC
├── utils/              # Utilities (persistence, speech, etc.)
└── types/              # TypeScript definitions
```

## 🌐 Deployment Notes

- **Fully static**: Can be deployed to any static hosting (Vercel, Netlify, GitHub Pages)
- **No backend required**: All game logic runs client-side
- **HTTPS required**: WebRTC and Speech Recognition need secure context
- **Mobile responsive**: Works on tablets and mobile devices

---

## 🎯 **Ready to Survive?**

**Kill Code delivers a unique blend of creative storytelling, AI-powered content generation, and real-time multiplayer competition - all running entirely in your browser!**

🚀 **Start playing:** `npm run dev` → `http://localhost:5173`
