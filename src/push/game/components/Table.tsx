import { Badge, Group, Stack, Text } from "@mantine/core";
import type { PushGameState } from "../types";
import {
  canPlace,
  chooseOrder,
  columnLabel,
  isDice,
  MAX_COLUMNS,
  nameFor,
  points,
} from "../board";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace from "./CardFace";
import classes from "../push.module.css";

export type ColumnMode = "place" | "take" | null;

/** The middle of the table: the deck, the columns and the card waiting for one. */
export default function Table({
  gameState,
  me,
  mode,
  onColumn,
}: {
  gameState: PushGameState;
  me?: string | null;
  /** What tapping a column does for the viewer right now. */
  mode: ColumnMode;
  onColumn: (column: number) => void;
}) {
  const name = (email: string) => nameFor(email, me);
  const columns = gameState.columns || [];
  const pending = gameState.pending;
  const choosing = gameState.phase === "CHOOSE";
  const take = gameState.lastTake;
  const justTaken = take && take.turn === gameState.turn && !pending;
  const slots = Math.max(
    columns.length,
    mode === "place" && columns.length < MAX_COLUMNS ? columns.length + 1 : 0,
  );
  const order = chooseOrder(gameState);
  const turnName = name(gameState.turnPlayer);

  return (
    <Stack gap="sm" align="center" data-testid="table">
      <Group gap="xs" justify="center" wrap="wrap">
        <Badge variant="light" radius="sm" size="lg">
          Deck {gameState.deckCount}
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          Turn {gameState.turn + 1}
        </Badge>
        {gameState.switches > 0 && (
          <Badge variant="light" color="violet" radius="sm" size="lg">
            {gameState.switches} switch{gameState.switches === 1 ? "" : "es"}:
            choosing from the {gameState.switches % 2 ? "right" : "left"}
          </Badge>
        )}
      </Group>

      <div className={classes.columns} data-testid="columns">
        {Array.from({ length: slots }, (_, i) => {
          const cards = columns[i] || [];
          const isNew = i >= columns.length;
          const open =
            mode === "place" && pending
              ? isNew || canPlace(cards, pending)
              : mode === "take"
                ? !isNew
                : false;
          const value = points(cards);
          const label = isNew
            ? "Start a new column"
            : `Column ${i + 1}: ${columnLabel(cards)}`;
          return (
            <button
              key={`${gameState.turn}-${i}`}
              type="button"
              className={`${classes.column} ${open ? classes.columnOpen : ""}`}
              disabled={!open}
              aria-label={
                open
                  ? `${mode === "place" ? "Place in" : "Take"} ${label.toLowerCase()}`
                  : label
              }
              onClick={() => open && onColumn(i)}
              data-testid={`column-${i}`}
            >
              {isNew ? (
                <Text size="sm" c="yellow.4" fw={700} ta="center" px="xs">
                  New
                  <br />
                  column
                </Text>
              ) : (
                <>
                  <div className={classes.stack}>
                    {cards.map((card, j) => (
                      <div
                        key={`${card}-${j}`}
                        className={
                          j === cards.length - 1 ? classes.landed : undefined
                        }
                      >
                        <CardFace card={card} width={64} decorative />
                      </div>
                    ))}
                  </div>
                  <Text
                    size="xs"
                    fw={700}
                    c={cards.some(isDice) ? "orange.4" : undefined}
                  >
                    {value} pts{cards.some(isDice) ? " · roll" : ""}
                  </Text>
                </>
              )}
            </button>
          );
        })}
        {!slots && (
          <Text size="sm" c="dimmed" style={{ alignSelf: "center" }}>
            {justTaken && take
              ? `${name(take.email)} took ${columnLabel(take.cards)}.`
              : "No columns yet."}
          </Text>
        )}
      </div>

      {pending && (
        <Group gap="sm" justify="center" wrap="nowrap" data-testid="pending">
          <div
            className={classes.pending}
            key={`${gameState.turn}-${gameState.drawn}`}
          >
            <CardFace card={pending} width={64} />
          </div>
          <Text size="sm" fw={600}>
            {turnName === "you" ? "You turned" : `${turnName} turned`} over{" "}
            {columnLabel([pending])}: it needs a column.
          </Text>
        </Group>
      )}

      <Text size="xs" c="dimmed" ta="center">
        {choosing ? (
          <>
            {turnName === "you" ? "Your" : `${turnName}'s`} turn is over.{" "}
            <b>{name(gameState.activePlayer)}</b>{" "}
            {gameState.activePlayer === me ? "choose" : "chooses"} a column
            {isBotName(gameState.activePlayer) && <ThinkingDots />}
            {gameState.choosers?.length
              ? `, then ${gameState.choosers.map(displayName).join(", ")}`
              : ""}
            .
          </>
        ) : (
          <>
            <b>{turnName === "you" ? "Your" : `${turnName}'s`}</b> turn
            {isBotName(gameState.turnPlayer) &&
              gameState.activePlayer === gameState.turnPlayer && (
                <ThinkingDots />
              )}
            . After it the others choose: {order.map(displayName).join(", ")}.
          </>
        )}
      </Text>
    </Stack>
  );
}
