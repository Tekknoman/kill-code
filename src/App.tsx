import { Game } from './components/Game';
import { WebRTCProvider } from './context/WebRTCContext';
import './App.css';

function App() {
  return (
    <WebRTCProvider>
      <Game />
    </WebRTCProvider>
  );
}

export default App;
