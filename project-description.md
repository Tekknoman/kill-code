# Kill Code - Enhanced Decentralized Game Concept

## 1. Overview

An enhanced, fully **frontend-only** browser game inspired by *Kill Code*, built with **React** using **Pollinations React hooks** and **WebRTC**.

### Goals

* Rich, multimodal game experience (text, image, audio).
* Zero AI hosting cost (each player uses their own Pollinations API calls).
* Decentralized architecture: no backend servers (except signaling for WebRTC).
* Fully in-browser, cross-platform.

---

## 2. Game Flow & Logic

### Round Structure

1. **Scenario Maker Phase**

   * One player becomes the *scenario maker* for the round.
   * Player types or speaks a survival scenario.
   * A configurable **time limit** is enforced (set by host).
   * The scenario is processed:

     * Scenario text is refined into an **image prompt** via LLM.
     * Scenario illustration is generated via `usePollinationsImage`.
     * Scenario text is converted to **TTS audio**.
   * The complete scenario (text, image, audio) is broadcast to all players.

2. **Strategy Phase**

   * All other players (and the scenario maker themselves) must submit a survival strategy.
   * Input options:

     * Typed text.
     * Spoken input (transcribed via STT).
   * Configurable **time limit** enforced for strategy input.

3. **Outcome Generation**

   * For each player:

     * Strategy + scenario is processed by LLM to generate an **outcome narrative**.
     * Outcome text is converted to **TTS audio**.
     * Outcome narrative is refined into an **image prompt**.
     * Outcome illustration is generated.
     * Result is classified as "Survived" or "Died" (via LLM prompt logic).

4. **Outcome Reveal**

   * Results are shared peer-to-peer via WebRTC DataChannel.
   * Each player's outcome is presented in sequence:

     * Fate text displayed.
     * Generated outcome image shown.
     * Fate narration audio played.
     * Survival result + score update.

5. **Round Rotation**

   * Scenario maker role rotates to the next player.
   * Game continues for a set number of rounds or until manually ended.

---

## 3. Technical Stack

### Core Technologies

* **React** for UI.
* **Pollinations React hooks** for AI capabilities:

  * `usePollinationsText`
  * `usePollinationsImage`
* **react-speech-recognition** for STT.
* **WebRTC DataChannels** for peer-to-peer communication.
* **Signaling server** (minimal, e.g. Socket.io) for WebRTC session negotiation.

### Pollinations Integration

#### Scenario Creation

```js
const refinedPrompt = usePollinationsText(
  `Convert this scenario into a vivid image prompt:\n"${scenarioText}"`,
  { model: 'openai', systemPrompt: 'You are a creative prompt engineer.' }
);

const imageUrl = usePollinationsImage(refinedPrompt, { width: 512, height: 512 });

const scenarioAudioUrl = usePollinationsText(
  scenarioText,
  { model: 'openai-audio', voice: 'nova' }
);
```

#### Strategy Outcome

```js
const outcomeNarrative = usePollinationsText(
  `Given this scenario and strategy, narrate a dramatic fate: survived or died.`,
  { model: 'openai', systemPrompt: 'You are the game master adjudicating survival.' }
);

const outcomeAudioUrl = usePollinationsText(outcomeNarrative, { model: 'openai-audio', voice: 'nova' });

const outcomePrompt = usePollinationsText(
  `Convert the following outcome into a descriptive image prompt:\n"${outcomeNarrative}"`,
  { model: 'openai', systemPrompt: 'You are a creative prompt engineer.' }
);

const outcomeImageUrl = usePollinationsImage(outcomePrompt, { width: 512, height: 512 });
```

### STT Integration

```js
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Start listening
SpeechRecognition.startListening({ continuous: true });

// Stop and get transcript
SpeechRecognition.stopListening();
const transcript = useSpeechRecognition().transcript;
```

---

## 4. Game State Management

### Key State Elements

* `currentRound`
* `currentScenarioMaker`
* `scenarioText`
* `scenarioImage`
* `scenarioAudio`
* `strategies[]`
* `outcomes[]`
* `scores{ playerId: score }`
* `timer{ phase: 'scenario' | 'strategy', remainingSeconds }`

### Suggested State Management Tools

* **React Context** for global game state.
* **Zustand** or **Redux Toolkit** for more complex state management.

---

## 5. WebRTC Communication

### Message Flow

* Initial connection: minimal signaling to establish DataChannel.
* Broadcast messages:

  * `scenario_broadcast` { text, imageUrl, audioUrl }
  * `strategy_submission` { playerId, strategyText }
  * `outcome_broadcast` { playerId, text, imageUrl, audioUrl, survived }
  * `score_update` { playerId, newScore }

### Reliability

* Use ACK + retry mechanism for important messages (scenarios, outcomes).
* Use sequence numbers to avoid out-of-order display.

---

## 6. Final Summary

* Scenario creation rotates among players.
* Each player has limited time to submit survival strategy.
* Rich AI-driven fate generation: text, image, TTS.
* All runs fully frontend with React.
* Pollinations provides all AI capabilities via React hooks.
* WebRTC ensures decentralized P2P communication.
* Players share outcomes P2P and update scores.

---

## 7. Next Steps for Implementation

1. Scaffold React app.
2. Integrate Pollinations React hooks.
3. Implement STT via `react-speech-recognition`.
4. Set up basic WebRTC DataChannel with signaling.
5. Implement round-based game state logic.
6. Build timer components.
7. Implement outcome reveal UI.
8. Add scores and leaderboard.
9. Polish UX and animations.
10. Test with multiple players.

---

This document can be used by developers to fully realize the enhanced \*Kill Code \*concept. It is designed to be open, extensible, and provide a highly engaging multimodal experience fully within the browser.

---
