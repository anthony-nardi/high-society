import { Badge, Center, Container, Group, Loader, Stack } from "@mantine/core";
import { useCallback, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Master, ShangriLaGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel, { Mode } from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeShangriLaMaster from "../client/placeShangriLaMaster";
import recruitShangriLaStudents from "../client/recruitShangriLaStudents";
import journeyShangriLa from "../client/journeyShangriLa";
import { journeys, neighbours, placements, recruitable } from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

type Selection = {
  key: string;
  mode: Mode;
  village: number | null;
  destination: number | null;
  picks: [number, Master][];
};

const EMPTY: Omit<Selection, "key"> = {
  mode: "place",
  village: null,
  destination: null,
  picks: [],
};

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<ShangriLaGameState>();
  const [selection, setSelection] = useState<Selection>({ key: "", ...EMPTY });
  const [loading, setLoading] = useState(false);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";
  useTurnAlert(isActive && inProgress, "The Bridges of Shangri-La");

  const turnKey = `${gameState?.turn}:${gameState?.phase}:${gameState?.activePlayer}`;
  const current = useMemo(
    () =>
      selection.key === turnKey
        ? selection
        : { key: turnKey, ...EMPTY, mode: selection.mode },
    [selection, turnKey],
  );
  const update = useCallback(
    (patch: Partial<Omit<Selection, "key">>) =>
      setSelection((s) => ({
        ...(s.key === turnKey ? s : { key: turnKey, ...EMPTY, mode: s.mode }),
        ...patch,
      })),
    [turnKey],
  );

  const me = loggedInPlayer?.email;
  const setup = gameState?.phase === "SETUP";
  const mode: Mode = setup ? "place" : current.mode;

  const options = useMemo(() => {
    if (!gameState || !me || !isActive)
      return {
        place: [] as [number, Master][],
        recruit: [] as [number, Master][],
        journey: [] as [number, number][],
      };
    return {
      place: placements(gameState, me),
      recruit: recruitable(gameState, me),
      journey: journeys(gameState, me),
    };
  }, [gameState, me, isActive]);

  const highlights = useMemo(() => {
    const h: { [village: number]: Highlight } = {};
    if (!gameState) return h;
    if (gameState.lastMove?.to !== undefined) h[gameState.lastMove.to] = "last";
    else if (gameState.lastMove?.village !== undefined)
      h[gameState.lastMove.village] = "last";
    if (!isActive || loading) return h;
    if (mode === "journey") {
      if (current.village === null) {
        for (const [from] of options.journey) h[from] = "selectable";
      } else {
        h[current.village] = "selected";
        for (const to of neighbours(gameState.bridges || [], current.village))
          h[to] = current.destination === to ? "selected" : "target";
      }
      return h;
    }
    const pool = mode === "recruit" ? options.recruit : options.place;
    for (const [village] of pool) h[village] = "selectable";
    if (current.village !== null) h[current.village] = "selected";
    for (const [village] of current.picks) h[village] = "selected";
    return h;
  }, [gameState, isActive, loading, mode, current, options]);

  const typesHere = useMemo(() => {
    if (current.village === null) return [];
    const pool = mode === "recruit" ? options.recruit : options.place;
    return pool.filter(([v]) => v === current.village).map(([, t]) => t);
  }, [current.village, mode, options]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVillage = useCallback(
    (village: number) => {
      if (!gameState || !isActive || loading) return;
      if (mode === "journey") {
        if (current.village === null) {
          if (options.journey.some(([from]) => from === village))
            update({ village, destination: null });
        } else if (village === current.village) {
          update({ village: null, destination: null });
        } else if (
          neighbours(gameState.bridges || [], current.village).includes(village)
        ) {
          update({ destination: village });
        } else if (options.journey.some(([from]) => from === village)) {
          update({ village, destination: null });
        }
        return;
      }
      const pool = mode === "recruit" ? options.recruit : options.place;
      if (pool.some(([v]) => v === village))
        update({ village: village === current.village ? null : village });
      else update({ village: null });
    },
    [gameState, isActive, loading, mode, current.village, options, update],
  );

  const handleType = useCallback(
    (type: Master) => {
      if (current.village === null) return;
      const village = current.village;
      void call(() => placeShangriLaMaster({ lobbyUID, village, type }));
    },
    [current.village, lobbyUID, call],
  );

  const handleTogglePick = useCallback(
    (village: number, type: Master) => {
      const exists = current.picks.some(
        ([v, t]) => v === village && t === type,
      );
      if (exists)
        update({
          picks: current.picks.filter(
            ([v, t]) => !(v === village && t === type),
          ),
        });
      else if (current.picks.length < 2)
        update({ picks: [...current.picks, [village, type]] });
    },
    [current.picks, update],
  );

  const handleConfirm = useCallback(() => {
    if (mode === "recruit" && current.picks.length) {
      const picks = current.picks;
      void call(() => recruitShangriLaStudents({ lobbyUID, picks }));
    } else if (
      mode === "journey" &&
      current.village !== null &&
      current.destination !== null
    ) {
      const from = current.village;
      const to = current.destination;
      void call(() => journeyShangriLa({ lobbyUID, from, to }));
    }
  }, [mode, current, lobbyUID, call]);

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

  const standing = (gameState.bridges || []).length;

  return (
    <>
      <TurnBanner active={isActive && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={tableClasses.players}
            style={{
              gridTemplateColumns:
                gameState.players.length > 3 ? "1fr 1fr" : undefined,
            }}
          >
            {gameState.players.map((player) => (
              <PlayerOverview
                key={player.email}
                player={player}
                gameState={gameState}
              />
            ))}
          </div>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            aria-busy={loading}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  {setup ? "Setup" : `Turn ${gameState.turn}`}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {standing} bridge{standing === 1 ? "" : "s"} standing
                </Badge>
              </Group>
              <Board
                gameState={gameState}
                highlights={highlights}
                onClick={isActive && !loading ? handleVillage : undefined}
              />
            </Stack>
          </div>
        </div>
      </Container>
      {loggedInPlayer && (
        <div
          className={
            isActive ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {loggedInPlayer && (
        <ActionPanel
          gameState={gameState}
          isActive={isActive}
          mode={mode}
          onMode={(m) =>
            update({ mode: m, village: null, destination: null, picks: [] })
          }
          village={current.village}
          destination={current.destination}
          types={typesHere}
          picks={current.picks}
          loading={loading}
          onType={handleType}
          onTogglePick={handleTogglePick}
          onConfirm={handleConfirm}
          onCancel={() =>
            update({ village: null, destination: null, picks: [] })
          }
        />
      )}
    </>
  );
}
