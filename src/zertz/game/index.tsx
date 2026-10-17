import {
  Badge,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import useGameState from "../../shared/hooks/useGameState";
import { useUserContext } from "../../shared/context/useUserContext";
import useTurnAlert from "../../shared/hooks/useTurnAlert";
import useGameSounds from "../../shared/hooks/useGameSounds";
import useBotNudge from "../../shared/hooks/useBotNudge";
import { useLobbyContext } from "../../shared/context/useLobbyContext";
import TurnBanner from "../../shared/components/TurnBanner";
import { Colour, COLOURS, Coord, ZertzGameState } from "./types";
import Board, { Highlight } from "./components/Board";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import Marble from "./components/Marble";
import placeMarble from "../client/placeMarble";
import removeRingCall from "../client/removeRing";
import captureMarble from "../client/captureMarble";
import {
  applyCapture,
  applyPlace,
  applyRemoveRing,
  capturers,
  count,
  isRemovable,
  isVacant,
  jumpsFrom,
  placeableColours,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

/** A preview of a move, valid only against the server state it was made from. */
type Optimistic = { version: string; state: ZertzGameState };

/** Anything the server changes after a move changes this. */
const versionOf = (s: ZertzGameState | null | undefined) =>
  s
    ? [
        s.turn,
        s.phase,
        s.activePlayer,
        s.capturingAt,
        s.notification?.timestamp,
        s.rings.length,
        Object.keys(s.marbles || {}).length,
      ].join(":")
    : "";

/** How long a preview may outlive its call before the server state wins. */
const OPTIMISTIC_TTL_MS = 8000;

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<ZertzGameState>();
  const [selectedColour, setSelectedColour] = useState<Colour | null>(null);
  // The selection is tied to the turn and phase it was made in, so a new
  // turn or phase drops it without an effect.
  const [selection, setSelection] = useState<{
    key: string;
    marble: Coord | null;
  }>({
    key: "",
    marble: null,
  });
  const [loading, setLoading] = useState(false);
  const [optimistic, setOptimistic] = useState<Optimistic | null>(null);

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const serverVersion = versionOf(gameState);
  const shown =
    optimistic && optimistic.version === serverVersion && gameState
      ? optimistic.state
      : gameState;
  const pending = loading || (!!shown && shown !== gameState);

  // A preview that the server never answered is dropped after a while.
  useEffect(() => {
    if (!optimistic) return;
    const timer = window.setTimeout(
      () => setOptimistic((o) => (o === optimistic ? null : o)),
      OPTIMISTIC_TTL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [optimistic]);

  const loggedInPlayer = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const isActive =
    !!gameState &&
    !!loggedInPlayer &&
    loggedInPlayer.email === gameState.activePlayer;
  const inProgress = gameState?.status === "IN_PROGRESS";

  useTurnAlert(isActive && inProgress, "ZÈRTZ");

  const phaseKey = `${gameState?.turn}:${gameState?.phase}`;
  const selectedMarble = selection.key === phaseKey ? selection.marble : null;
  const setSelectedMarble = useCallback(
    (marble: Coord | null) => setSelection({ key: phaseKey, marble }),
    [phaseKey],
  );

  const colours = gameState ? placeableColours(gameState) : [];
  const colour =
    selectedColour && colours.includes(selectedColour)
      ? selectedColour
      : (colours[0] ?? null);

  const highlights = useMemo(() => {
    const h: { [coord: Coord]: Highlight } = {};
    if (!shown || !gameState) return h;
    if (shown.lastMove?.to) h[shown.lastMove.to] = "last";
    if (!isActive || pending) return h;
    const jumpers = capturers(shown);
    if (shown.phase === "CONTINUE_CAPTURE" && shown.capturingAt) {
      h[shown.capturingAt] = "selected";
      for (const to of jumpsFrom(shown, shown.capturingAt)) h[to] = "target";
    } else if (shown.phase === "MOVE" && jumpers.length) {
      for (const from of jumpers) h[from] = "capturer";
      if (selectedMarble && jumpers.includes(selectedMarble)) {
        h[selectedMarble] = "selected";
        for (const to of jumpsFrom(shown, selectedMarble)) h[to] = "target";
      }
    } else if (shown.phase === "REMOVE_RING") {
      for (const c of shown.rings)
        if (isRemovable(shown, c)) h[c] = "removable";
    }
    return h;
  }, [shown, gameState, isActive, pending, selectedMarble]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(
    async (fn: () => Promise<boolean>, preview: ZertzGameState) => {
      const version = serverVersion;
      setOptimistic({ version, state: preview });
      setLoading(true);
      let accepted = false;
      try {
        accepted = await fn();
      } finally {
        setLoading(false);
        if (!accepted) setOptimistic(null);
      }
    },
    [serverVersion],
  );

  const handleClick = useCallback(
    (coord: Coord) => {
      if (!gameState || !isActive || pending) return;
      const h = highlights[coord];
      if (gameState.phase === "CONTINUE_CAPTURE") {
        if (h === "target" && gameState.capturingAt) {
          const from = gameState.capturingAt;
          void call(
            () => captureMarble({ lobbyUID, from, to: coord }),
            applyCapture(gameState, from, coord),
          );
        }
        return;
      }
      if (gameState.phase === "REMOVE_RING") {
        if (h === "removable") {
          void call(
            () => removeRingCall({ lobbyUID, coord }),
            applyRemoveRing(gameState, coord),
          );
        }
        return;
      }
      const jumpers = capturers(gameState);
      if (jumpers.length) {
        if (h === "capturer") setSelectedMarble(coord);
        else if (h === "selected") setSelectedMarble(null);
        else if (h === "target" && selectedMarble) {
          void call(
            () => captureMarble({ lobbyUID, from: selectedMarble, to: coord }),
            applyCapture(gameState, selectedMarble, coord),
          );
        } else {
          // Tapping anywhere else puts the marble back.
          setSelectedMarble(null);
        }
        return;
      }
      if (colour && isVacant(gameState, coord)) {
        void call(
          () => placeMarble({ lobbyUID, colour, to: coord }),
          applyPlace(gameState, colour, coord),
        );
      }
    },
    [
      gameState,
      isActive,
      pending,
      highlights,
      selectedMarble,
      colour,
      lobbyUID,
      call,
      setSelectedMarble,
    ],
  );

  const isGameActive =
    isSignedIn && gameState && gameState.status && lobbyId && user;
  const isGameOver = isGameActive && gameState?.status === "GAME_OVER";

  if (gameState === null || !shown) return null;
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
      <TurnBanner active={isActive && inProgress} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div className={tableClasses.players}>
            {shown.players.map((player) => (
              <PlayerOverview
                key={player.email}
                player={player}
                gameState={shown}
              />
            ))}
          </div>
          <div
            className={`${tableClasses.board} ${pending ? tableClasses.boardPending : ""}`}
            aria-busy={pending}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  Turn {shown.turn}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {shown.rings.length} rings left
                </Badge>
              </Group>
              <Board
                gameState={shown}
                highlights={highlights}
                onClick={isActive && !pending ? handleClick : undefined}
              />
              <Group gap="md" justify="center" aria-label="Marble pool">
                <Text size="sm" c="dimmed">
                  Pool
                </Text>
                {COLOURS.map((c) => (
                  <Group key={c} gap={4} wrap="nowrap">
                    <Marble colour={c} size={20} />
                    <Text size="sm" fw={600}>
                      {count(shown.pool, c)}
                    </Text>
                  </Group>
                ))}
              </Group>
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
          gameState={shown}
          isActive={isActive}
          selectedColour={colour}
          selectedMarble={selectedMarble}
          loading={pending}
          onSelectColour={setSelectedColour}
          onCancel={() => setSelectedMarble(null)}
        />
      )}
    </>
  );
}
