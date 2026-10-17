import "../razzia/App.css";
import Lobby from "../shared/lobby";
import initializeFirebase from "../shared/utils/initializeFirebase";
import Login from "../shared/login";
import GameTitle from "./game/components/GameTitle";
import YinshRules from "./game/components/RulesDrawer";
import { GameStateProvider } from "../shared/context/GameStateProvider";
import { LobbyProvider } from "../shared/context/LobbyProvider";
import { UserProvider } from "../shared/context/UserProvider";
import SoundToggle from "../shared/components/SoundToggle";
import Game from "./game";

initializeFirebase();

function App() {
  return (
    <div className="App">
      <UserProvider>
        <LobbyProvider>
          <GameStateProvider gameName={"yinsh"}>
            <SoundToggle />
            <YinshRules />
            <GameTitle />
            <Login />
            <Lobby gameName={"yinsh"} />
            <Game />
          </GameStateProvider>
        </LobbyProvider>
      </UserProvider>
    </div>
  );
}

export default App;
