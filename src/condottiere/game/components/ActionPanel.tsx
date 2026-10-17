import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { Card, CondottiereGameState, CondottierePlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import CardFace from "./CardFace";
import {
  CARD_HELP,
  CARD_LABEL,
  isMercenary,
  popeTargets,
  REGIONS,
} from "../board";
import classes from "./ActionPanel.module.css";

export type Pending = { index: number; card: Card } | null;

/** Fixed strip: your hand during a battle, the pass button, and the follow-up for a Scarecrow or Bishop. */
export default function ActionPanel({
  gameState,
  me,
  pending,
  loading,
  onCard,
  onPass,
  onSkipPope,
  onCancel,
}: {
  gameState: CondottiereGameState;
  me: CondottierePlayerState;
  /** A Scarecrow or Bishop tapped and waiting for its target. */
  pending: Pending;
  loading: boolean;
  onCard: (index: number) => void;
  onPass: () => void;
  onSkipPope: () => void;
  onCancel: () => void;
}) {
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);
  const hand = me.hand || [];

  if (!acting || gameState.phase === "CHOOSE") {
    return (
      <div
        className={`${classes.panel} ${acting ? classes.active : classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={6} align="center">
          {acting && (
            <Badge color="yellow" variant="filled" radius="sm" size="lg">
              You hold the Condottiere
            </Badge>
          )}
          <Text size="sm" c="dimmed" ta="center">
            {loading ? (
              <>
                Sending your move
                <ThinkingDots />
              </>
            ) : acting ? (
              "Tap a glowing region on the map to call the next battle there."
            ) : gameState.phase === "CHOOSE" ? (
              <>
                Waiting for {who} to choose the battlefield.
                {isBotName(gameState.activePlayer) && <ThinkingDots />}
              </>
            ) : me.passed ? (
              <>
                You have passed. Waiting for {who}.
                {isBotName(gameState.activePlayer) && <ThinkingDots />}
              </>
            ) : (
              <>
                Waiting for {who} to play or pass.
                {isBotName(gameState.activePlayer) && <ThinkingDots />}
              </>
            )}
          </Text>
          {!acting && hand.length > 0 && (
            <Group gap={4} justify="center" wrap="wrap" aria-label="Your hand">
              {hand.map((card, i) => (
                <CardFace key={`${i}-${card}`} card={card} width={40} />
              ))}
            </Group>
          )}
        </Stack>
      </div>
    );
  }

  let hint: string;
  if (loading) hint = "Sending your move…";
  else if (pending?.card === "SCARECROW")
    hint = "Tap one of the mercenaries in your line above to take it back.";
  else if (pending?.card === "BISHOP")
    hint = popeTargets(gameState).length
      ? "Every copy of the strongest mercenary on the table is discarded. Tap a region on the map to send the Pope there, or play without moving him."
      : "Every copy of the strongest mercenary on the table is discarded.";
  else
    hint =
      "Tap a card to play it, or pass to sit out the rest of this battle. Hover a card for what it does.";

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Your turn
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          {!loading && !pending && (
            <Button variant="default" onClick={onPass}>
              Pass
            </Button>
          )}
          {!loading && pending?.card === "BISHOP" && (
            <Button variant="light" onClick={onSkipPope}>
              Play without moving the Pope
            </Button>
          )}
          {!loading && pending && (
            <Button variant="default" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
        {!loading && (
          <Group gap={6} justify="center" wrap="wrap" aria-label="Your hand">
            {hand.map((card, i) => (
              <CardFace
                key={`${i}-${card}`}
                card={card}
                width={48}
                selected={pending?.index === i}
                dimmed={!!pending && pending.index !== i}
                onClick={pending ? undefined : () => onCard(i)}
              />
            ))}
          </Group>
        )}
        <Text size="sm" c="dimmed" ta="center">
          {hint}
          {pending && !loading
            ? ` ${CARD_LABEL[pending.card]}: ${CARD_HELP[pending.card]}`
            : ""}
        </Text>
        {!loading && !pending && hand.some((c) => !isMercenary(c)) && (
          <Text size="xs" c="dimmed" ta="center">
            {gameState.battlefield !== undefined
              ? `Fighting for ${REGIONS[gameState.battlefield].name}. `
              : ""}
            Scarecrows and Bishops ask where to aim before they are played.
          </Text>
        )}
      </Stack>
    </div>
  );
}
