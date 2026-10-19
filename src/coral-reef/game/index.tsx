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
import { CoralReefGameState, Grid } from "./types";
import ReefGrid, { CellHighlight } from "./components/ReefGrid";
import CardFace from "./components/CardFace";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel, { Draft } from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeCoralReefCard from "../client/placeCoralReefCard";
import {
  CARD_INFO,
  CARD_TYPES,
  GROUP_COLOUR,
  GROUP_LABEL,
  gridOf,
  hasChosen,
  label,
  moveTargets,
  openCells,
  parseCell,
  runningScore,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

const EMPTY: Draft = {
  card: null,
  cell: null,
  pick: null,
  swapWith: null,
  moveTo: null,
};

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<CoralReefGameState>();
  const [loading, setLoading] = useState(false);
  const [draftState, setDraftState] = useState<{ key: string; draft: Draft }>({
    key: "",
    draft: EMPTY,
  });

  useGameSounds(gameState?.notification);
  useBotNudge(lobbyId, gameState);

  const me = useMemo(() => {
    if (!gameState || !user) return null;
    return gameState.players.find((p) => p.email === user.email) || null;
  }, [gameState, user]);

  const inProgress = gameState?.status === "IN_PROGRESS";
  const mustPick =
    !!gameState &&
    !!me &&
    inProgress &&
    !hasChosen(gameState, me.email) &&
    (me.hand || []).length > 0;
  useTurnAlert(mustPick, "Coral Reef");

  const pickKey = `${gameState?.round}:${gameState?.pick}:${(me?.hand || []).length}`;
  const draft = draftState.key === pickKey ? draftState.draft : EMPTY;
  const setDraft = useCallback(
    (d: Draft) => setDraftState({ key: pickKey, draft: d }),
    [pickKey],
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

  const grid = useMemo(() => (me ? gridOf(me) : {}), [me]);
  const card =
    draft.card === null ? null : ((me?.hand || [])[draft.card] ?? null);
  const octopus = card === "OCTOPUS";

  /** The reef with the draft placed, before any Octopus shuffle. */
  const placedGrid = useMemo((): Grid => {
    if (!card || draft.cell === null) return grid;
    return { ...grid, [draft.cell]: card };
  }, [grid, card, draft.cell]);

  /** The reef as it would look with the draft placed and shuffled. */
  const previewGrid = useMemo((): Grid => {
    if (!octopus || draft.pick === null) return placedGrid;
    const next: Grid = { ...placedGrid };
    if (draft.swapWith && next[draft.pick] && next[draft.swapWith]) {
      [next[draft.pick], next[draft.swapWith]] = [
        next[draft.swapWith],
        next[draft.pick],
      ];
    } else if (draft.moveTo && next[draft.pick]) {
      next[draft.moveTo] = next[draft.pick];
      delete next[draft.pick];
    }
    return next;
  }, [placedGrid, octopus, draft]);

  const highlights = useMemo(() => {
    const h: { [cell: string]: CellHighlight } = {};
    if (!gameState || !me) return h;
    for (const p of gameState.lastPick || [])
      if (p.email === me.email) h[p.cell] = "new";
    if (!mustPick || loading) return h;
    if (draft.card !== null && draft.cell === null)
      for (const c of openCells(grid)) h[c] = "open";
    if (draft.cell !== null) {
      h[draft.cell] = "target";
      if (octopus && draft.pick !== null) {
        if (draft.swapWith) {
          h[draft.pick] = "swap";
          h[draft.swapWith] = "swap";
        } else if (draft.moveTo) {
          h[draft.moveTo] = "move";
          h[draft.pick] = "pick";
        } else {
          h[draft.pick] = "pick";
          for (const t of moveTargets(placedGrid, draft.pick)) h[t] = "move";
        }
      }
    }
    return h;
  }, [gameState, me, mustPick, loading, draft, grid, octopus, placedGrid]);

  const handleCell = useCallback(
    (cell: string) => {
      if (!mustPick || loading || draft.card === null) return;
      if (draft.cell === null) {
        if (openCells(grid).includes(cell)) setDraft({ ...draft, cell });
        return;
      }
      if (octopus) {
        // Picking up a card, then a second card to swap or an empty cell to move to.
        if (draft.pick === null) {
          if (cell === draft.cell && !placedGrid[cell]) return;
          if (placedGrid[cell]) setDraft({ ...draft, pick: cell });
          else if (openCells(grid).includes(cell))
            setDraft({ ...draft, cell, pick: null });
          return;
        }
        if (draft.swapWith || draft.moveTo) {
          setDraft({ ...draft, pick: null, swapWith: null, moveTo: null });
          return;
        }
        if (cell === draft.pick) {
          setDraft({ ...draft, pick: null });
          return;
        }
        if (placedGrid[cell]) setDraft({ ...draft, swapWith: cell });
        else if (moveTargets(placedGrid, draft.pick).includes(cell))
          setDraft({ ...draft, moveTo: cell });
        return;
      }
      if (cell === draft.cell) setDraft({ ...draft, cell: null });
      else if (openCells(grid).includes(cell)) setDraft({ ...draft, cell });
    },
    [mustPick, loading, draft, grid, octopus, placedGrid, setDraft],
  );

  const place = useCallback(() => {
    if (draft.card === null || draft.cell === null) return;
    const [row, col] = parseCell(draft.cell);
    const payload = {
      lobbyUID,
      card: draft.card,
      row,
      col,
      ...(octopus && draft.pick && draft.swapWith
        ? { swap: [draft.pick, draft.swapWith] as [string, string] }
        : {}),
      ...(octopus && draft.pick && draft.moveTo
        ? { move: [draft.pick, draft.moveTo] as [string, string] }
        : {}),
    };
    void call(() => placeCoralReefCard(payload));
  }, [draft, octopus, call, lobbyUID]);

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

  const score = runningScore(previewGrid);
  const others = gameState.players.filter((p) => p.email !== me?.email);

  return (
    <>
      <TurnBanner active={mustPick} />
      <Container fluid px="md" pt={44} pb="md">
        <div className={tableClasses.table}>
          <div
            className={`${tableClasses.board} ${loading ? tableClasses.boardPending : ""}`}
            style={{ order: 1 }}
            aria-busy={loading}
          >
            <Stack gap="xs" align="center">
              <Group gap="sm" justify="center" wrap="wrap">
                <Badge variant="light" radius="sm" size="lg">
                  Round {gameState.round} · pick{" "}
                  {Math.min(gameState.pick + 1, 10)} of 10 · passing{" "}
                  {gameState.round === 1 ? "left" : "right"}
                </Badge>
                {me && (
                  <Badge
                    variant="light"
                    color="green"
                    radius="sm"
                    size="lg"
                    title="Card points so far with the whales' flips chosen; the plankton placing comes at the end"
                  >
                    {score.total} pts · food web +{score.foodWeb}
                  </Badge>
                )}
              </Group>
              {me ? (
                <div style={{ maxWidth: "100%", overflowX: "auto" }}>
                  <ReefGrid
                    grid={previewGrid}
                    size={56}
                    highlights={highlights}
                    flipped={score.flipped}
                    onCell={handleCell}
                    pickable={
                      octopus &&
                      draft.cell !== null &&
                      !draft.swapWith &&
                      !draft.moveTo
                    }
                  />
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  You are watching this game.
                </Text>
              )}
              {me && Object.keys(previewGrid).length > 0 && (
                <Group gap={6} justify="center" wrap="wrap" aria-label="Points">
                  {(["PRODUCERS", "PREY", "PREDATORS"] as const).map((g) => (
                    <span
                      key={g}
                      style={{
                        padding: "1px 8px",
                        borderRadius: 6,
                        background: GROUP_COLOUR[g],
                        color: "#1a1a1a",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {GROUP_LABEL[g]}{" "}
                      {g === "PRODUCERS"
                        ? score.producers
                        : g === "PREY"
                          ? score.prey
                          : score.predators}
                    </span>
                  ))}
                  {CARD_TYPES.filter((t) => score.byType[t]).map((t) => (
                    <span
                      key={t}
                      style={{
                        padding: "1px 7px",
                        borderRadius: 6,
                        background: CARD_INFO[t].colour,
                        color: "#1a1a1a",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      title={label(t)}
                    >
                      {CARD_INFO[t].emoji} {score.byType[t]}
                    </span>
                  ))}
                  {score.plankton > 0 && (
                    <span
                      style={{
                        padding: "1px 7px",
                        borderRadius: 6,
                        background: CARD_INFO.PLANKTON.colour,
                        color: "#1a1a1a",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      title="Plankton: the placing is decided at the end"
                    >
                      🦠 ×{score.plankton}
                    </span>
                  )}
                </Group>
              )}
              {gameState.neutral && (
                <Group
                  gap={4}
                  justify="center"
                  wrap="wrap"
                  aria-label="Neutral hand's set-aside cards"
                >
                  <Text size="xs" c="dimmed">
                    Neutral set aside:
                  </Text>
                  {(gameState.neutral.discards || []).map((c, i) => (
                    <CardFace key={i} type={c} size={22} />
                  ))}
                  {!(gameState.neutral.discards || []).length && (
                    <Text size="xs" c="dimmed">
                      nothing yet
                    </Text>
                  )}
                </Group>
              )}
            </Stack>
          </div>
          <div
            className={tableClasses.players}
            style={{ order: 2, gridTemplateColumns: "1fr", minWidth: 0 }}
          >
            <Stack gap="sm" style={{ minWidth: 0 }}>
              {others.map((player) => (
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
            mustPick ? panelClasses.pageSpacer : panelClasses.pageSpacerCompact
          }
        />
      )}
      {me && (
        <ActionPanel
          gameState={gameState}
          me={me}
          draft={draft}
          loading={loading}
          onCard={(index) =>
            setDraft(draft.card === index ? EMPTY : { ...EMPTY, card: index })
          }
          onPlace={place}
          onClearShuffle={() =>
            setDraft({ ...draft, pick: null, swapWith: null, moveTo: null })
          }
          onCancel={() => setDraft(EMPTY)}
        />
      )}
    </>
  );
}
