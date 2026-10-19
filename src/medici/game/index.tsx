import { Center, Container, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import type { MediciGameState } from "./types";
import Auction from "./components/Auction";
import Tracks from "./components/Tracks";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import DayLedger from "./components/DayLedger";
import GameOver from "./components/GameOver";
import {
  bidMedici,
  drawMediciCard,
  offerMediciLot,
  passMedici,
} from "../client/mediciActions";
import panelClasses from "./components/ActionPanel.module.css";
import classes from "./medici.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<MediciGameState>();
  const [loading, setLoading] = useState(false);
  const [closedDay, setClosedDay] = useState(0);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const inProgress = gameState?.status === "IN_PROGRESS";
  const isActive =
    !!gameState && !!me && inProgress && me.email === gameState.activePlayer;
  useTurnAlert(isActive, "Medici");

  // The day's ledger opens itself the evening it is written, until dismissed.
  const scoredDay =
    gameState?.dayScoring &&
    inProgress &&
    gameState.dayScoring.turn === gameState.turn &&
    !gameState.lot
      ? gameState.dayScoring.day
      : 0;
  const ledgerShown = ledgerOpen || (scoredDay > 0 && scoredDay !== closedDay);

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
      <TurnBanner active={isActive} />
      <DayLedger
        opened={ledgerShown}
        onClose={() => {
          setClosedDay(gameState.dayScoring?.day || 0);
          setLedgerOpen(false);
        }}
        scoring={gameState.dayScoring}
        gameState={gameState}
        me={user?.email}
      />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            style={{ order: 1 }}
            aria-busy={loading}
          >
            <Stack gap="md" align="center">
              <Auction
                gameState={gameState}
                me={user?.email}
                onLedger={() => setLedgerOpen(true)}
              />
              <Tracks gameState={gameState} me={user?.email} />
            </Stack>
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr", minWidth: 0 }}
          >
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
          </div>
        </div>
      </Container>
      {me && (
        <div
          className={
            isActive ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {me && (
        <ActionPanel
          gameState={gameState}
          player={me}
          isActive={isActive}
          loading={loading}
          onDraw={() => void call(() => drawMediciCard({ lobbyUID }))}
          onOffer={() => void call(() => offerMediciLot({ lobbyUID }))}
          onBid={(amount) => void call(() => bidMedici({ lobbyUID, amount }))}
          onPass={() => void call(() => passMedici({ lobbyUID }))}
        />
      )}
    </>
  );
}
