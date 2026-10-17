import { createContext, useContext } from "react";
import useGameState from "../hooks/useGameState";
import type { GameName } from "@games/shared/types";
import type { HighSocietyGameState } from "../../high-society/game/types";
import type { NoThanksGameState } from "../../no-thanks/game/types";
import type { RazziaGameState } from "../../razzia/game/types";
import type { FamilyIncGameState } from "../../family-inc/game/types";
import type { ZertzGameState } from "../../zertz/game/types";
import type { YinshGameState } from "../../yinsh/game/types";
import type { DvonnGameState } from "../../dvonn/game/types";
import type { GipfGameState } from "../../gipf/game/types";
import type { LyngkGameState } from "../../lyngk/game/types";

/** The public state each game's screens read. */
export type GameStateFor<T extends GameName> = T extends "high-society"
  ? HighSocietyGameState
  : T extends "no-thanks"
    ? NoThanksGameState
    : T extends "razzia"
      ? RazziaGameState
      : T extends "family-inc"
        ? FamilyIncGameState
        : T extends "zertz"
          ? ZertzGameState
          : T extends "yinsh"
            ? YinshGameState
            : T extends "dvonn"
              ? DvonnGameState
              : T extends "gipf"
                ? GipfGameState
                : T extends "lyngk"
                  ? LyngkGameState
                  : never;

type ContextValue = {
  isGameStatusLoading: boolean | null;
  gameState: unknown;
};

const GameStateContext = createContext<ContextValue>({
  isGameStatusLoading: null,
  gameState: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useGameStateContext<T extends GameName>(
  // The name is only here to pick the state type; one provider serves all games.
  gameType: T,
): { gameState: GameStateFor<T> | null; isGameStatusLoading: boolean | null } {
  void gameType;
  const context = useContext(GameStateContext);
  return context as {
    gameState: GameStateFor<T> | null;
    isGameStatusLoading: boolean | null;
  };
}

export const GameStateProvider = ({
  children,
}: {
  gameName: GameName;
  children: React.ReactNode;
}) => {
  const { isLoading: isGameStatusLoading, gameState } = useGameState<unknown>();
  return (
    <GameStateContext.Provider value={{ gameState, isGameStatusLoading }}>
      {children}
    </GameStateContext.Provider>
  );
};
