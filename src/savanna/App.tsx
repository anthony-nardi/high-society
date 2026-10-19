import "../razzia/App.css";
import Lobby from "../shared/lobby";
import initializeFirebase from "../shared/utils/initializeFirebase";
import Login from "../shared/login";
import GameTitle from "./game/components/GameTitle";
import SavannaRules from "./game/components/RulesDrawer";
import { GameStateProvider } from "../shared/context/GameStateProvider";
import { LobbyProvider } from "../shared/context/LobbyProvider";
import { UserProvider } from "../shared/context/UserProvider";
import SoundToggle from "../shared/components/SoundToggle";
import PanelInset from "../shared/components/PanelInset";
import StatsDrawer from "../shared/components/StatsDrawer";
import Game from "./game";
import savannaLobby from "./lobbyTheme";

initializeFirebase();

function App() {
  return (
    <div className="App">
      <UserProvider>
        <LobbyProvider>
          <GameStateProvider gameName={"savanna"}>
            <SoundToggle />
            <PanelInset />
            <StatsDrawer gameName={"savanna"} />
            <SavannaRules />
            <GameTitle />
            <Login />
            <Lobby gameName={"savanna"} theme={savannaLobby} />
            <Game />
          </GameStateProvider>
        </LobbyProvider>
      </UserProvider>
    </div>
  );
}

export default App;
