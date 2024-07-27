import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "./lobby";
import initializeFirebase from "./utils/initializeFirebase";
import Login from "./login";
import Game from "./game";
import GameTitle from "./game/components/GameTitle";
import { GameStateProvider } from "./context/GameStateProvider";
import { LobbyProvider } from "./context/LobbyProvider";

initializeFirebase();

function App() {
  return (
    <div className="App">
      <LobbyProvider>
        <GameStateProvider>
          <GameTitle />
          <Login />
          <Lobby />
          <Game />
        </GameStateProvider>
      </LobbyProvider>
    </div>
  );
}

export default App;
