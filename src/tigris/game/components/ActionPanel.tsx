import { useState } from "react";
import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { Colour, TigrisGameState, TigrisPlayerState } from "../types";
import {
  COLOUR_HEX,
  COLOUR_WORD,
  COLOURS,
  DYNASTY_SYMBOL,
  LEADER_NAME,
  label,
  TILE_NAME,
} from "../board";
import TileIcon from "./TileIcon";
import classes from "./ActionPanel.module.css";
import boardClasses from "../tigris.module.css";

export type Selection =
  | { kind: "tile"; colour: Colour; index: number }
  | { kind: "leader"; colour: Colour }
  | { kind: "catastrophe" }
  | { kind: "replace"; indexes: number[] };

function LeaderToken({
  colour,
  dynasty,
  size = 34,
}: {
  colour: Colour;
  dynasty: TigrisPlayerState["dynasty"];
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#fbf3e2",
        border: `4px solid ${COLOUR_HEX[colour]}`,
        fontSize: size * 0.45,
      }}
    >
      {DYNASTY_SYMBOL[dynasty]}
    </span>
  );
}

export default function ActionPanel({
  gameState,
  player,
  acting,
  loading,
  selection,
  onSelect,
  onWithdraw,
  onReplace,
  onEndTurn,
  onCommit,
  onChooseWar,
  onBuild,
  onSkipMonument,
  onTakeTreasure,
}: {
  gameState: TigrisGameState;
  player: TigrisPlayerState;
  acting: boolean;
  loading: boolean;
  selection: Selection | null;
  onSelect: (selection: Selection | null) => void;
  onWithdraw: (colour: Colour) => void;
  onReplace: (indexes: number[]) => void;
  onEndTurn: () => void;
  onCommit: (count: number) => void;
  onChooseWar: (colour: Colour) => void;
  onBuild: (cell: string, colours: [Colour, Colour]) => void;
  onSkipMonument: () => void;
  onTakeTreasure: (cell: string) => void;
}) {
  const [commit, setCommit] = useState<{ key: string; count: number }>({
    key: "",
    count: 0,
  });
  const hand = player.hand || [];
  const who = displayName(gameState.activePlayer);
  const leaders = gameState.leaders || {};
  const leaderCell = (colour: Colour) =>
    Object.entries(leaders).find(
      ([, l]) => l.email === player.email && l.colour === colour,
    )?.[0];
  const phase = gameState.phase;
  const conflict = gameState.conflict;

  const handStrip = (disabled: boolean) => (
    <div className={boardClasses.hand} aria-label="Your tiles">
      {hand.map((colour, index) => {
        const pressed =
          (selection?.kind === "tile" && selection.index === index) ||
          (selection?.kind === "replace" && selection.indexes.includes(index));
        return (
          <button
            key={`${colour}-${index}`}
            type="button"
            className={boardClasses.piece}
            aria-pressed={pressed}
            aria-label={`${TILE_NAME[colour]} tile`}
            disabled={disabled}
            onClick={() => {
              if (selection?.kind === "replace") {
                const indexes = selection.indexes.includes(index)
                  ? selection.indexes.filter((i) => i !== index)
                  : [...selection.indexes, index];
                onSelect({ kind: "replace", indexes });
              } else onSelect(pressed ? null : { kind: "tile", colour, index });
            }}
          >
            <TileIcon colour={colour} size={44} />
          </button>
        );
      })}
    </div>
  );

  if (!acting) {
    const waitingOn =
      phase === "CONFLICT" && conflict
        ? `${who} is deciding what to commit`
        : phase === "TREASURE"
          ? `${who} is choosing a treasure`
          : `Waiting for ${who}`;
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Text size="sm" c="dimmed" ta="center">
            {waitingOn}
            {isBotName(gameState.activePlayer) && <ThinkingDots />}
          </Text>
          {hand.length > 0 && handStrip(true)}
        </Stack>
      </div>
    );
  }

  if (phase === "CONFLICT" && conflict) {
    const available = hand.filter((c) => c === conflict.colour).length;
    const attacking = conflict.attacker === player.email;
    const key = `${conflict.kind}:${conflict.colour}:${conflict.stage}:${gameState.turn}`;
    const count = commit.key === key ? commit.count : 0;
    const mine = attacking ? conflict.attackerBase : conflict.defenderBase;
    const theirs = attacking
      ? conflict.defenderBase
      : conflict.attackerBase + (conflict.attackerCommit || 0);
    const unit =
      conflict.kind === "REVOLT" ? "temple" : TILE_NAME[conflict.colour];
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="orange" variant="filled" radius="sm" size="lg">
              {attacking ? "You attack" : "You defend"}
            </Badge>
            {loading && <Loader size="xs" color="yellow" />}
            <Group gap={4} wrap="nowrap">
              <Button
                variant="default"
                size="compact-sm"
                disabled={count <= 0 || loading}
                onClick={() => setCommit({ key, count: count - 1 })}
                aria-label="Commit one fewer"
              >
                −
              </Button>
              <Text fw={700} w={28} ta="center">
                {count}
              </Text>
              <Button
                variant="default"
                size="compact-sm"
                disabled={count >= available || loading}
                onClick={() => setCommit({ key, count: count + 1 })}
                aria-label="Commit one more"
              >
                +
              </Button>
            </Group>
            <Button disabled={loading} onClick={() => onCommit(count)}>
              {count
                ? `Commit ${count} ${unit}${count === 1 ? "" : "s"}`
                : "Commit nothing"}
            </Button>
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            You have {mine} on the board and {available} {unit}
            {available === 1 ? "" : "s"} in hand.{" "}
            {attacking ? "They" : "The attacker"} {attacking ? "have" : "has"}{" "}
            {theirs}
            {attacking ? " and may still commit more" : ""}. With {count}{" "}
            committed you stand at {mine + count};{" "}
            {attacking ? "ties go to the defender" : "a tie holds"}.
          </Text>
        </Stack>
      </div>
    );
  }

  if (phase === "WAR_CHOICE") {
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="orange" variant="filled" radius="sm" size="lg">
              Which war first?
            </Badge>
            {(gameState.warChoices || []).map((colour) => (
              <Button
                key={colour}
                disabled={loading}
                style={{ background: COLOUR_HEX[colour] }}
                onClick={() => onChooseWar(colour)}
              >
                The {LEADER_NAME[colour]}s
              </Button>
            ))}
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            Each war is fought with the kingdom as it stands after the one
            before.
          </Text>
        </Stack>
      </div>
    );
  }

  if (phase === "MONUMENT" && gameState.monumentOffer) {
    const offer = gameState.monumentOffer;
    const pairs = (gameState.monumentsLeft || []).filter((p) =>
      p.includes(offer.colour),
    );
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Build a monument?
            </Badge>
            {offer.squares.map((cell) =>
              pairs.map((pair) => (
                <Button
                  key={`${cell}-${pair.join("")}`}
                  disabled={loading}
                  variant="light"
                  onClick={() => onBuild(cell, pair)}
                >
                  {COLOUR_WORD[pair[0]]} & {COLOUR_WORD[pair[1]]}
                  {offer.squares.length > 1 ? ` at ${label(cell)}` : ""}
                </Button>
              )),
            )}
            <Button
              variant="default"
              disabled={loading}
              onClick={onSkipMonument}
            >
              Leave it
            </Button>
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            The four tiles turn facedown: they still link, but no longer support
            anyone. Each turn the monument pays a point to each of your leaders
            of its colours in that kingdom.
          </Text>
        </Stack>
      </div>
    );
  }

  if (phase === "TREASURE" && gameState.treasureOffer) {
    return (
      <div
        className={`${classes.panel} ${classes.active} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          <Group gap="sm" justify="center" wrap="wrap">
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              Take a treasure
            </Badge>
            {gameState.treasureOffer.cells.map((cell) => (
              <Button
                key={cell}
                disabled={loading}
                onClick={() => onTakeTreasure(cell)}
              >
                {label(cell)}
              </Button>
            ))}
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            Your trader's kingdom holds several treasures: all but one are
            yours.
          </Text>
        </Stack>
      </div>
    );
  }

  // ACTION
  const replacing = selection?.kind === "replace";
  const selectedLeader = selection?.kind === "leader" ? selection.colour : null;
  const selectedLeaderCell = selectedLeader
    ? leaderCell(selectedLeader)
    : undefined;
  let hint = "Pick a tile, a leader or a catastrophe, then tap a lit space.";
  if (selection?.kind === "tile")
    hint = `Tap a lit space to place the ${TILE_NAME[selection.colour]}.`;
  else if (selection?.kind === "leader")
    hint = selectedLeaderCell
      ? `Tap a lit space to move the ${LEADER_NAME[selection.colour]}, or withdraw it.`
      : `Tap a lit space beside a temple to seat the ${LEADER_NAME[selection.colour]}.`;
  else if (selection?.kind === "catastrophe")
    hint = "Tap a tile to destroy it, or any empty space to block it.";
  else if (replacing)
    hint = "Choose the tiles to send back, then replace them.";

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn · {gameState.actionsLeft} action
            {gameState.actionsLeft === 1 ? "" : "s"} left
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          {replacing ? (
            <>
              <Button
                disabled={loading || !selection.indexes.length}
                onClick={() => onReplace(selection.indexes)}
              >
                Replace {selection.indexes.length || ""}
              </Button>
              <Button
                variant="default"
                disabled={loading}
                onClick={() => onSelect(null)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                disabled={loading || !hand.length}
                onClick={() => onSelect({ kind: "replace", indexes: [] })}
              >
                Replace tiles
              </Button>
              {selectedLeader && selectedLeaderCell && (
                <Button
                  variant="light"
                  color="red"
                  disabled={loading}
                  onClick={() => onWithdraw(selectedLeader)}
                >
                  Withdraw the {LEADER_NAME[selectedLeader]}
                </Button>
              )}
              <Button
                variant="default"
                color="gray"
                disabled={loading}
                onClick={onEndTurn}
              >
                End turn
              </Button>
            </>
          )}
        </Group>
        {handStrip(loading)}
        <Group gap={6} justify="center" wrap="wrap" aria-label="Your leaders">
          {COLOURS.map((colour) => {
            const cell = leaderCell(colour);
            const pressed = selectedLeader === colour;
            return (
              <button
                key={colour}
                type="button"
                className={boardClasses.piece}
                aria-pressed={pressed}
                aria-label={`${LEADER_NAME[colour]}${cell ? ` at ${label(cell)}` : ""}`}
                disabled={loading || replacing}
                onClick={() =>
                  onSelect(pressed ? null : { kind: "leader", colour })
                }
                title={`${LEADER_NAME[colour]}${cell ? ` at ${label(cell)}` : ", in hand"}`}
              >
                <Stack gap={0} align="center">
                  <LeaderToken colour={colour} dynasty={player.dynasty} />
                  <Text size="xs" c="dimmed">
                    {cell ? label(cell) : LEADER_NAME[colour]}
                  </Text>
                </Stack>
              </button>
            );
          })}
          <button
            type="button"
            className={boardClasses.piece}
            aria-pressed={selection?.kind === "catastrophe"}
            aria-label={`catastrophe, ${player.catastrophes} left`}
            disabled={loading || replacing || player.catastrophes <= 0}
            onClick={() =>
              onSelect(
                selection?.kind === "catastrophe"
                  ? null
                  : { kind: "catastrophe" },
              )
            }
          >
            <Stack gap={0} align="center">
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#3a3330",
                  color: "#e74c3c",
                  fontWeight: 900,
                  fontSize: 20,
                }}
              >
                ✕
              </span>
              <Text size="xs" c="dimmed">
                {player.catastrophes} left
              </Text>
            </Stack>
          </button>
        </Group>
        <Text size="xs" c="dimmed" ta="center" data-testid="hint">
          {hint}
        </Text>
      </Stack>
    </div>
  );
}
