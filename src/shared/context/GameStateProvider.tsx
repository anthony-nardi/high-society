import { createContext, useContext } from "react";
import useGameState from "../hooks/useGameState";
import { GameName } from "../../high-society/client/createLobby";
import { HighSocietyGameState as HighSocietyGameState } from "../../high-society/game/types";
import { NoThanksGameState } from "../../no-thanks/game/types";
import { RazziaGameState } from "../../razzia/game/types";

type GameState<T extends string> = T extends "high-society"
  ? HighSocietyGameState
  : T extends "no-thanks"
  ? NoThanksGameState
  : T extends "razzia"
  ? RazziaGameState
  : never;

const HighSocietyContext = createContext<{
  isGameStatusLoading: boolean | null;
  gameState: HighSocietyGameState | null;
}>({
  isGameStatusLoading: null,
  gameState: null,
});

const NoThanksContext = createContext<{
  isGameStatusLoading: boolean | null;
  gameState: NoThanksGameState | null;
}>({
  isGameStatusLoading: null,
  gameState: null,
});

const RazziaContext = createContext<{
  isGameStatusLoading: boolean | null;
  gameState: RazziaGameState | null;
}>({
  isGameStatusLoading: null,
  gameState: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useHighSocietyGameState(): {
  isGameStatusLoading: boolean | null;
  gameState: HighSocietyGameState | null;
} {
  const context = useContext(HighSocietyContext);
  if (!context)
    throw new Error(
      "HighSocietyGameState must be used within a HighSocietyProvider"
    );
  return context;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useNoThanksGameState(): {
  isGameStatusLoading: boolean | null;
  gameState: NoThanksGameState | null;
} {
  const context = useContext(NoThanksContext);
  if (!context)
    throw new Error("NoThanksGameState must be used within a NoThanksProvider");
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRazziaGameState(): {
  isGameStatusLoading: boolean | null;
  gameState: RazziaGameState | null;
} {
  const context = useContext(RazziaContext);
  if (!context)
    throw new Error("RazziaGameState must be used within a RazziaProvider");
  return context;
}

// eslint-disable-next-line
export function useGameStateContext<T extends string>(
  gameType: T
): {
  gameState: GameState<T>;
  isGameStatusLoading: boolean | null;
} {
  let returnVal;
  if (gameType === "high-society") {
    // eslint-disable-next-line
    returnVal = useHighSocietyGameState();
  } else if (gameType === "no-thanks") {
    // eslint-disable-next-line
    returnVal = useNoThanksGameState();
  } else if (gameType === "razzia") {
    // eslint-disable-next-line
    returnVal = useRazziaGameState();
  } else {
    throw new Error("Invalid game type");
  }
  // @ts-expect-error fix
  return returnVal;
}
export const GameStateProvider = ({
  gameName,
  children,
}: {
  gameName: GameName;
  children: React.ReactNode;
}) => {
  const { isLoading: isGameStatusLoading, gameState } =
    useGameState<GameState<typeof gameName>>();

  if (gameName === "high-society") {
    return (
      <HighSocietyContext.Provider
        value={
          { gameState, isGameStatusLoading } as {
            isGameStatusLoading: boolean | null;
            gameState: HighSocietyGameState | null;
          }
        }
      >
        {children}
      </HighSocietyContext.Provider>
    );
  } else if (gameName === "no-thanks") {
    return (
      <NoThanksContext.Provider
        value={
          { gameState, isGameStatusLoading } as {
            isGameStatusLoading: boolean | null;
            gameState: NoThanksGameState | null;
          }
        }
      >
        {children}
      </NoThanksContext.Provider>
    );
  } else if (gameName === "razzia") {
    return (
      <RazziaContext.Provider
        value={
          { gameState, isGameStatusLoading } as {
            isGameStatusLoading: boolean | null;
            gameState: RazziaGameState | null;
          }
        }
      >
        {children}
      </RazziaContext.Provider>
    );
  } else {
    throw new Error("Invalid game type");
  }
};
