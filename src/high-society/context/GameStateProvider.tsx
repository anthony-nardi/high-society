import { createContext, useContext } from "react";
import useGameState from "../game/hooks/useGameState";
import { GameState } from "../game/types";
import { useLobbyContext } from "./LobbyProvider";
import { useUserContext } from "./useUserContext";

const GameStateContext = createContext<{
  isGameStatusLoading: boolean | null;
  gameState: GameState | null;
}>({
  isGameStatusLoading: null,
  gameState: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useGameStateContext = () => {
  const context = useContext(GameStateContext);

  if (!context) {
    throw new Error(
      "useGameStateContext must be used within a GameStateProvider"
    );
  }

  return context;
};

export const GameStateProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();

  const { isLoading: isGameStatusLoading, gameState } = useGameState(
    lobbyId,
    !!isSignedIn
  );

  return (
    <GameStateContext.Provider
      value={{
        isGameStatusLoading,
        gameState,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
};
