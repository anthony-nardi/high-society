import { Center, Container, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { ForSaleGameState } from "./types";
import Table from "./components/Table";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import bidForSale from "../client/bidForSale";
import passForSale from "../client/passForSale";
import sellForSale from "../client/sellForSale";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<ForSaleGameState>();
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const buying = gameState?.phase === "BUYING";
  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;
  /** While selling, your turn is simply "you have not chosen yet". */
  const mustAct =
    !!gameState &&
    !!loggedInPlayer &&
    gameState.status === "IN_PROGRESS" &&
    (buying
      ? isActive
      : !(gameState.chosen || []).includes(loggedInPlayer.email));

  useTurnAlert(mustAct, "For Sale");

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

  return (
    <>
      <TurnBanner active={mustAct} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div className={tableClasses.board} style={{ order: 1 }}>
            <Table gameState={gameState} />
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr" }}
          >
            <Stack gap="sm">
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
      {loggedInPlayer && (
        <div
          className={
            mustAct ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {loggedInPlayer && (
        <ActionPanel
          gameState={gameState}
          player={loggedInPlayer}
          isActive={isActive}
          loading={loading}
          onBid={(amount) => void call(() => bidForSale({ lobbyUID, amount }))}
          onPass={() => void call(() => passForSale({ lobbyUID }))}
          onSell={(property) =>
            void call(() => sellForSale({ lobbyUID, property }))
          }
        />
      )}
    </>
  );
}
