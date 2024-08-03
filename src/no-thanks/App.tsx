import "./App.css";
import "firebaseui/dist/firebaseui.css";
import Lobby from "../shared/lobby";
import initializeFirebase from "../shared/utils/initializeFirebase";
import Login from "../shared/login";
import Game from "./game";
import GameTitle from "./game/components/GameTitle";
import { GameStateProvider } from "../shared/context/GameStateProvider";
import { LobbyProvider } from "../shared/context/LobbyProvider";
import { UserProvider } from "../shared/context/UserProvider";

initializeFirebase();

function App() {
  return (
    <div className="App">
      <UserProvider>
        <LobbyProvider>
          <GameStateProvider gameName={"no-thanks"}>
            <GameTitle />
            <Login />
            <Lobby gameName={"no-thanks"} />
            <Game />
          </GameStateProvider>
        </LobbyProvider>
      </UserProvider>
    </div>
  );
}

export default App;
