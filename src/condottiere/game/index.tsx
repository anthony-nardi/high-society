import {
  Badge,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { CondottiereGameState } from "./types";
import Map, { Highlight } from "./components/Map";
import BattleLines from "./components/BattleLines";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel, { Pending } from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import chooseCondottiereBattlefield from "../client/chooseCondottiereBattlefield";
import playCondottiereCard from "../client/playCondottiereCard";
import passCondottiere from "../client/passCondottiere";
import { battlefields, popeTargets, REGIONS } from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<CondottiereGameState>();
  const [loading, setLoading] = useState(false);
  const [pendingState, setPendingState] = useState<{
    key: string;
    pending: Pending;
  }>({ key: "", pending: null });

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const acting = !!gameState && !!me && me.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(acting && inProgress, "Condottiere");

  const turnKey = `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}:${(me?.hand || []).length}`;
  const pending = pendingState.key === turnKey ? pendingState.pending : null;
  const setPending = useCallback(
    (p: Pending) => setPendingState({ key: turnKey, pending: p }),
    [turnKey],
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

  const highlights = useMemo(() => {
    const h: { [region: number]: Highlight } = {};
    if (!gameState || !acting || loading) return h;
    if (gameState.phase === "CHOOSE")
      for (const r of battlefields(gameState)) h[r] = "selectable";
    else if (pending?.card === "BISHOP")
      for (const r of popeTargets(gameState)) h[r] = "selectable";
    return h;
  }, [gameState, acting, loading, pending]);

  const handleRegion = useCallback(
    (region: number) => {
      if (!gameState || !acting || loading) return;
      if (gameState.phase === "CHOOSE") {
        void call(() => chooseCondottiereBattlefield({ lobbyUID, region }));
      } else if (pending?.card === "BISHOP") {
        const index = pending.index;
        void call(() =>
          playCondottiereCard({ lobbyUID, index, target: region }),
        );
      }
    },
    [gameState, acting, loading, pending, lobbyUID, call],
  );

  const handleCard = useCallback(
    (index: number) => {
      if (!gameState || !me || loading) return;
      const card = (me.hand || [])[index];
      if (!card) return;
      if (
        card === "SCARECROW" ||
        (card === "BISHOP" && popeTargets(gameState).length > 0)
      ) {
        setPending({ index, card });
        return;
      }
      void call(() => playCondottiereCard({ lobbyUID, index }));
    },
    [gameState, me, loading, lobbyUID, call, setPending],
  );

  const handleMercenary = useCallback(
    (lineIndex: number) => {
      if (!pending || pending.card !== "SCARECROW") return;
      const index = pending.index;
      void call(() =>
        playCondottiereCard({ lobbyUID, index, target: lineIndex }),
      );
    },
    [pending, lobbyUID, call],
  );

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
                  {gameState.phase === "CHOOSE"
                    ? "Choosing the battlefield"
                    : `Battle ${gameState.turn}`}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {gameState.deckCount} in the deck · win {gameState.winTotal}{" "}
                  or {gameState.winAdjacent} adjacent
                </Badge>
                {gameState.pope !== undefined && (
                  <Badge variant="light" color="violet" radius="sm" size="lg">
                    Pope in {REGIONS[gameState.pope].name}
                  </Badge>
                )}
              </Group>
              <Map
                gameState={gameState}
                highlights={highlights}
                onClick={handleRegion}
              />
              {gameState.phase === "BATTLE" ? (
                <BattleLines
                  gameState={gameState}
                  me={me?.email}
                  pickingMercenary={pending?.card === "SCARECROW"}
                  onMercenary={handleMercenary}
                />
              ) : (
                gameState.lastBattle && (
                  <Text size="sm" c="dimmed" ta="center">
                    Last battle, {REGIONS[gameState.lastBattle.region].name}:{" "}
                    {gameState.lastBattle.totals
                      .map((t) => `${t.email.split("@")[0]} ${t.strength}`)
                      .join(", ")}
                    {gameState.lastBattle.winner
                      ? ` — ${gameState.lastBattle.winner.split("@")[0]} wins`
                      : " — nobody wins"}
                  </Text>
                )
              )}
            </Stack>
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
          pending={pending}
          loading={loading}
          onCard={handleCard}
          onPass={() => void call(() => passCondottiere({ lobbyUID }))}
          onSkipPope={() => {
            if (!pending) return;
            const index = pending.index;
            void call(() => playCondottiereCard({ lobbyUID, index }));
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </>
  );
}
