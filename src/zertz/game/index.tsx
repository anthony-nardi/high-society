import {
  Badge,
  Center,
  Container,
  Grid,
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
  capturers,
  count,
  isRemovable,
  isVacant,
  jumpsFrom,
  placeableColours,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";

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

  useTurnAlert(isActive && gameState?.status === "IN_PROGRESS", "ZÈRTZ");

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
    if (!gameState) return h;
    if (gameState.lastMove?.to) h[gameState.lastMove.to] = "last";
    if (!isActive) return h;
    const jumpers = capturers(gameState);
    if (gameState.phase === "CONTINUE_CAPTURE" && gameState.capturingAt) {
      h[gameState.capturingAt] = "selected";
      for (const to of jumpsFrom(gameState, gameState.capturingAt))
        h[to] = "target";
    } else if (gameState.phase === "MOVE" && jumpers.length) {
      for (const from of jumpers) h[from] = "capturer";
      if (selectedMarble && jumpers.includes(selectedMarble)) {
        h[selectedMarble] = "selected";
        for (const to of jumpsFrom(gameState, selectedMarble)) h[to] = "target";
      }
    } else if (gameState.phase === "REMOVE_RING") {
      for (const c of gameState.rings)
        if (isRemovable(gameState, c)) h[c] = "removable";
    }
    return h;
  }, [gameState, isActive, selectedMarble]);

  const lobbyUID = `${lobbyId}`;
  const call = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClick = useCallback(
    (coord: Coord) => {
      if (!gameState || !isActive || loading) return;
      const h = highlights[coord];
      if (gameState.phase === "CONTINUE_CAPTURE") {
        if (h === "target" && gameState.capturingAt) {
          void call(() =>
            captureMarble({
              lobbyUID,
              from: gameState.capturingAt as Coord,
              to: coord,
            }),
          );
        }
        return;
      }
      if (gameState.phase === "REMOVE_RING") {
        if (h === "removable")
          void call(() => removeRingCall({ lobbyUID, coord }));
        return;
      }
      const jumpers = capturers(gameState);
      if (jumpers.length) {
        if (h === "capturer" || h === "selected") setSelectedMarble(coord);
        else if (h === "target" && selectedMarble) {
          void call(() =>
            captureMarble({ lobbyUID, from: selectedMarble, to: coord }),
          );
        }
        return;
      }
      if (colour && isVacant(gameState, coord)) {
        void call(() => placeMarble({ lobbyUID, colour, to: coord }));
      }
    },
    [
      gameState,
      isActive,
      loading,
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
      <Container fluid px="md" pt={44} pb="md">
        <Grid>
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center">
                <Badge variant="light" radius="sm" size="lg">
                  Turn {gameState.turn}
                </Badge>
                <Badge variant="light" color="gray" radius="sm" size="lg">
                  {gameState.rings.length} rings left
                </Badge>
              </Group>
              <Board
                gameState={gameState}
                highlights={highlights}
                onClick={handleClick}
              />
              <Group gap="md" justify="center" aria-label="Marble pool">
                <Text size="sm" c="dimmed">
                  Pool
                </Text>
                {COLOURS.map((c) => (
                  <Group key={c} gap={4} wrap="nowrap">
                    <Marble colour={c} size={20} />
                    <Text size="sm" fw={600}>
                      {count(gameState.pool, c)}
                    </Text>
                  </Group>
                ))}
              </Group>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="sm">
              {gameState.players.map((player) => (
                <PlayerOverview
                  key={player.email}
                  player={player}
                  gameState={gameState}
                />
              ))}
            </Stack>
          </Grid.Col>
        </Grid>
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
          selectedColour={colour}
          selectedMarble={selectedMarble}
          loading={loading}
          onSelectColour={setSelectedColour}
          onCancel={() => setSelectedMarble(null)}
        />
      )}
    </>
  );
}
