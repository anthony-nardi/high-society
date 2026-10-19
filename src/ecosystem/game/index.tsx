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
import { EcosystemGameState } from "./types";
import EcosystemGrid, { CellHighlight } from "./components/EcosystemGrid";
import CardFace from "./components/CardFace";
import PlayerOverview from "./components/PlayerOverview";
import ActionPanel, { Draft } from "./components/ActionPanel";
import GameOver from "./components/GameOver";
import placeEcosystemCard from "../client/placeEcosystemCard";
import {
  CARD_INFO,
  CARD_TYPES,
  gridOf,
  hasChosen,
  label,
  openCells,
  parseCell,
  runningScore,
} from "./board";
import panelClasses from "./components/ActionPanel.module.css";
import tableClasses from "../../shared/table.module.css";

const EMPTY: Draft = { card: null, cell: null, swap: [] };

export default function Game() {
  const { user, isSignedIn } = useUserContext();
  const { lobbyId } = useLobbyContext();
  const { gameState, isLoading } = useGameState<EcosystemGameState>();
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
  useTurnAlert(mustPick, "Ecosystem");

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

  /** The ecosystem as it would look with the draft placed and swapped. */
  const previewGrid = useMemo(() => {
    if (!card || draft.cell === null) return grid;
    const next = { ...grid, [draft.cell]: card };
    if (card === "RABBIT" && draft.swap.length === 2) {
      const [a, b] = draft.swap;
      if (next[a] && next[b]) [next[a], next[b]] = [next[b], next[a]];
    }
    return next;
  }, [grid, card, draft]);

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
      for (const s of draft.swap) h[s] = "swap";
    }
    return h;
  }, [gameState, me, mustPick, loading, draft, grid]);

  const handleCell = useCallback(
    (cell: string) => {
      if (!mustPick || loading || draft.card === null) return;
      if (draft.cell === null) {
        if (openCells(grid).includes(cell)) setDraft({ ...draft, cell });
        return;
      }
      if (
        card === "RABBIT" &&
        draft.cell !== cell &&
        (previewGrid[cell] || cell === draft.cell)
      ) {
        if (draft.swap.includes(cell))
          setDraft({ ...draft, swap: draft.swap.filter((s) => s !== cell) });
        else if (draft.swap.length < 2)
          setDraft({ ...draft, swap: [...draft.swap, cell] });
        return;
      }
      if (cell === draft.cell) setDraft({ ...draft, cell: null, swap: [] });
      else if (openCells(grid).includes(cell))
        setDraft({ ...draft, cell, swap: [] });
    },
    [mustPick, loading, draft, grid, card, previewGrid, setDraft],
  );

  const place = useCallback(() => {
    if (draft.card === null || draft.cell === null) return;
    const [row, col] = parseCell(draft.cell);
    const payload = {
      lobbyUID,
      card: draft.card,
      row,
      col,
      ...(card === "RABBIT" && draft.swap.length === 2
        ? { swap: [draft.swap[0], draft.swap[1]] as [string, string] }
        : {}),
    };
    void call(() => placeEcosystemCard(payload));
  }, [draft, card, call, lobbyUID]);

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
                    title="Card points so far; stream and wolf placings come at the end"
                  >
                    {score.total} pts · {score.scoring} types scoring
                  </Badge>
                )}
              </Group>
              {me ? (
                <div style={{ maxWidth: "100%", overflowX: "auto" }}>
                  <EcosystemGrid
                    grid={previewGrid}
                    size={56}
                    highlights={highlights}
                    onCell={handleCell}
                    pickable={
                      card === "RABBIT" &&
                      draft.cell !== null &&
                      draft.swap.length < 2
                    }
                  />
                </div>
              ) : (
                <Text size="sm" c="dimmed">
                  You are watching this game.
                </Text>
              )}
              {me && Object.keys(previewGrid).length > 0 && (
                <Group
                  gap={6}
                  justify="center"
                  wrap="wrap"
                  aria-label="Points by type"
                >
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
            setDraft(
              draft.card === index
                ? EMPTY
                : { card: index, cell: null, swap: [] },
            )
          }
          onPlace={place}
          onClearSwap={() => setDraft({ ...draft, swap: [] })}
          onCancel={() => setDraft(EMPTY)}
        />
      )}
    </>
  );
}
