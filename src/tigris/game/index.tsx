import { Center, Container, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Colour, TigrisGameState } from "./types";
import Board from "./components/Board";
import ActionPanel, { Selection } from "./components/ActionPanel";
import { highlightsFor } from "./highlights";
import PlayerOverview from "./components/PlayerOverview";
import ConflictCard from "./components/ConflictCard";
import GameOver from "./components/GameOver";
import placeTigrisTile from "../client/placeTigrisTile";
import positionTigrisLeader from "../client/positionTigrisLeader";
import withdrawTigrisLeader from "../client/withdrawTigrisLeader";
import playTigrisCatastrophe from "../client/playTigrisCatastrophe";
import replaceTigrisTiles from "../client/replaceTigrisTiles";
import endTigrisTurn from "../client/endTigrisTurn";
import commitTigrisTiles from "../client/commitTigrisTiles";
import chooseTigrisWar from "../client/chooseTigrisWar";
import buildTigrisMonument from "../client/buildTigrisMonument";
import skipTigrisMonument from "../client/skipTigrisMonument";
import takeTigrisTreasure from "../client/takeTigrisTreasure";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";
import classes from "./tigris.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<TigrisGameState>();
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<{
    key: string;
    selection: Selection | null;
  }>({
    key: "",
    selection: null,
  });

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const acting = !!gameState && !!me && me.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(acting && inProgress, "Tigris & Euphrates");

  // A selection belongs to one moment of the game; it clears as the game moves on.
  const momentKey = gameState
    ? `${gameState.turn}:${gameState.phase}:${gameState.actionsLeft}:${gameState.activePlayer}`
    : "";
  const selection = picked.key === momentKey ? picked.selection : null;
  const select = useCallback(
    (s: Selection | null) => setPicked({ key: momentKey, selection: s }),
    [momentKey],
  );

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const isGameActive =
    isSignedIn && gameState && gameState.status && lobbyId && user;
  const isGameOver = isGameActive && gameState?.status === "GAME_OVER";

  if (gameState === null) return null;
  if (isLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }
  if (isGameOver) {
    return (
      <GameOver gameState={gameState} lobbyId={lobbyId?.toString() as string} />
    );
  }

  const highlights = me ? highlightsFor(gameState, me.email, selection) : {};

  const onCell = (cell: string) => {
    if (!me || loading || !highlights[cell]) return;
    if (gameState.phase === "TREASURE")
      return void call(() => takeTigrisTreasure({ lobbyUID, cell }));
    if (gameState.phase === "MONUMENT") return; // chosen from the panel
    if (!selection) return;
    if (selection.kind === "tile") {
      select(null);
      void call(() =>
        placeTigrisTile({ lobbyUID, cell, colour: selection.colour }),
      );
    } else if (selection.kind === "leader") {
      select(null);
      void call(() =>
        positionTigrisLeader({ lobbyUID, colour: selection.colour, cell }),
      );
    } else if (selection.kind === "catastrophe") {
      select(null);
      void call(() => playTigrisCatastrophe({ lobbyUID, cell }));
    }
  };

  return (
    <>
      <TurnBanner active={acting && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div className={tableClasses.board} style={{ order: 1 }}>
            <Board
              gameState={gameState}
              highlights={highlights}
              onCell={acting && !loading ? onCell : undefined}
              me={user?.email}
            />
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr" }}
          >
            <Stack gap="sm">
              <ConflictCard gameState={gameState} me={user?.email} />
              <div className={classes.players}>
                {gameState.players.map((player) => (
                  <PlayerOverview
                    key={player.email}
                    player={player}
                    gameState={gameState}
                    me={user?.email}
                  />
                ))}
              </div>
            </Stack>
          </div>
        </div>
      </Container>
      {me && (
        <div
          className={
            acting ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {me && (
        <ActionPanel
          gameState={gameState}
          player={me}
          acting={acting}
          loading={loading}
          selection={selection}
          onSelect={select}
          onWithdraw={(colour: Colour) => {
            select(null);
            void call(() => withdrawTigrisLeader({ lobbyUID, colour }));
          }}
          onReplace={(indexes) => {
            select(null);
            void call(() => replaceTigrisTiles({ lobbyUID, indexes }));
          }}
          onEndTurn={() => void call(() => endTigrisTurn({ lobbyUID }))}
          onCommit={(count) =>
            void call(() => commitTigrisTiles({ lobbyUID, count }))
          }
          onChooseWar={(colour) =>
            void call(() => chooseTigrisWar({ lobbyUID, colour }))
          }
          onBuild={(cell, colours) =>
            void call(() => buildTigrisMonument({ lobbyUID, cell, colours }))
          }
          onSkipMonument={() =>
            void call(() => skipTigrisMonument({ lobbyUID }))
          }
          onTakeTreasure={(cell) =>
            void call(() => takeTigrisTreasure({ lobbyUID, cell }))
          }
        />
      )}
    </>
  );
}
