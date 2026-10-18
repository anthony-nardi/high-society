import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { modeLabel } from "./board";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { AcquireGameState, Chain } from "./types";
import Board from "./components/Board";
import ChainTable from "./components/ChainTable";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeAcquireTile from "../client/placeAcquireTile";
import foundAcquireChain from "../client/foundAcquireChain";
import chooseAcquireSurvivor from "../client/chooseAcquireSurvivor";
import disposeAcquireStock from "../client/disposeAcquireStock";
import buyAcquireStock from "../client/buyAcquireStock";
import declareAcquireEnd from "../client/declareAcquireEnd";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<AcquireGameState>();
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const acting = !!gameState && !!me && me.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(acting && inProgress, "Acquire");

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

  const canTapBoard = acting && !loading && gameState.phase === "PLACE";

  return (
    <>
      <TurnBanner active={acting && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            style={{ order: 1 }}
            aria-busy={loading}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  Turn {gameState.turn}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {gameState.bagCount} tiles in the bag
                </Badge>
                <Badge
                  variant="light"
                  color={gameState.mode === "TYCOON" ? "orange" : "blue"}
                  radius="sm"
                  size="lg"
                  title={
                    gameState.mode === "TYCOON"
                      ? "Bonuses go to the top three stockholders"
                      : "Bonuses go to the top two stockholders"
                  }
                >
                  {modeLabel(gameState.mode)} Mode
                </Badge>
                {gameState.declaredBy && (
                  <Badge variant="filled" color="red" radius="sm" size="lg">
                    Final turn
                  </Badge>
                )}
              </Group>
              <Board
                gameState={gameState}
                hand={me?.tiles || []}
                lastTile={gameState.lastMove?.tile}
                onTile={
                  canTapBoard
                    ? (tile) =>
                        void call(() => placeAcquireTile({ lobbyUID, tile }))
                    : undefined
                }
              />
            </Stack>
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr" }}
          >
            <Stack gap="sm">
              <ChainTable gameState={gameState} me={me} />
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  gameState={gameState}
                />
              ))}
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
          me={me}
          loading={loading}
          onTile={(tile) =>
            void call(() => placeAcquireTile({ lobbyUID, tile }))
          }
          onFound={(chain: Chain) =>
            void call(() => foundAcquireChain({ lobbyUID, chain }))
          }
          onSurvivor={(chain: Chain) =>
            void call(() => chooseAcquireSurvivor({ lobbyUID, chain }))
          }
          onDispose={(sell, trade) =>
            void call(() => disposeAcquireStock({ lobbyUID, sell, trade }))
          }
          onBuy={(purchases) =>
            void call(() => buyAcquireStock({ lobbyUID, purchases }))
          }
          onDeclare={() => void call(() => declareAcquireEnd({ lobbyUID }))}
        />
      )}
    </>
  );
}
