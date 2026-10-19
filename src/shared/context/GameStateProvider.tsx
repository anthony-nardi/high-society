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
import type { ForSaleGameState } from "../../for-sale/game/types";
import type { ShangriLaGameState } from "../../shangri-la/game/types";
import type { AcquireGameState } from "../../acquire/game/types";
import type { CondottiereGameState } from "../../condottiere/game/types";
import type { RideTheRailsGameState } from "../../ride-the-rails/game/types";
import type { ClansGameState } from "../../clans/game/types";
import type { TwixtGameState } from "../../twixt/game/types";
import type { EcosystemGameState } from "../../ecosystem/game/types";
import type { FujiFlushGameState } from "../../fuji-flush/game/types";
import type { TigrisGameState } from "../../tigris/game/types";
import type { CoralReefGameState } from "../../coral-reef/game/types";
import type { SavannaGameState } from "../../savanna/game/types";
import type { MediciGameState } from "../../medici/game/types";

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
                  : T extends "for-sale"
                    ? ForSaleGameState
                    : T extends "shangri-la"
                      ? ShangriLaGameState
                      : T extends "acquire"
                        ? AcquireGameState
                        : T extends "condottiere"
                          ? CondottiereGameState
                          : T extends "ride-the-rails"
                            ? RideTheRailsGameState
                            : T extends "clans"
                              ? ClansGameState
                              : T extends "twixt"
                                ? TwixtGameState
                                : T extends "ecosystem"
                                  ? EcosystemGameState
                                  : T extends "fuji-flush"
                                    ? FujiFlushGameState
                                    : T extends "tigris"
                                      ? TigrisGameState
                                      : T extends "coral-reef"
                                        ? CoralReefGameState
                                        : T extends "savanna"
                                          ? SavannaGameState
                                          : T extends "medici"
                                            ? MediciGameState
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
