# 🎮 Kill Code - AI-Powered Survival Game

A decentralized browser game where players create survival scenarios and compete using AI-generated content. Built with React, TypeScript, Tailwind CSS, and Pollinations AI.

## 🌟 Features

- **AI-Generated Content**: Scenarios, outcomes, and images powered by Pollinations AI
- **Voice Recognition**: Speak your scenarios and strategies using Web Speech API
- **Real-time Multiplayer**: WebRTC peer-to-peer communication (in development)
- **No Backend Required**: Fully client-side with optional signaling server
- **Beautiful UI**: Modern dark theme with Tailwind CSS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A modern web browser with Speech Recognition support (Chrome/Edge recommended)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## 🎯 How to Play

### Game Setup
1. **Create a Room**: Enter your name and create a new room
2. **Share Room Code**: Give the room code to friends to join
3. **Configure Settings**: Host can adjust time limits and number of rounds
4. **Start Game**: Need at least 2 players to begin

### Game Flow

The game follows a structured round-based flow with AI-powered content generation throughout.

## 🛠 Technical Architecture

Built with modern web technologies for a fast, reliable experience:

- **React 19** + **TypeScript** for robust UI development
- **Tailwind CSS v4** for beautiful, responsive styling
- **Pollinations AI** for dynamic content generation
- **WebRTC** for real-time peer-to-peer communication
- **Zustand** for efficient state management

## 🎮 Current Status

✅ **Implemented:**
- Complete UI with modern dark theme
- Game state management and timer system
- Lobby system with room codes
- Speech recognition integration
- Pollinations AI integration for text and images
- WebRTC communication setup

🚧 **In Development:**
- Multiplayer signaling server
- Enhanced AI outcome generation
- Audio narration features

## 🔧 Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

---

**Ready to survive? The Kill Code adventure awaits! 🎯**

*Currently running in development mode at http://localhost:5173*
