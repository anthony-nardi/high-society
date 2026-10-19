import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { Card, CondottiereGameState, CondottierePlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import FanHand from "../../../shared/components/FanHand";
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

/**
 * Fixed strip: your hand fanned along the bottom, the pass button, and the
 * follow-up for a Scarecrow or Bishop. Tapping a card lifts it into the
 * tray; playing it is a second tap on the button.
 */
export default function ActionPanel({
  gameState,
  me,
  pending,
  loading,
  onCard,
  onPass,
  onSkipPope,
  onCancel,
  onMercenary,
}: {
  gameState: CondottiereGameState;
  me: CondottierePlayerState;
  /** A Scarecrow or Bishop played and waiting for its target. */
  pending: Pending;
  loading: boolean;
  onCard: (index: number) => void;
  onPass: () => void;
  onSkipPope: () => void;
  onCancel: () => void;
  /** A Scarecrow waiting: which mercenary in your line to take back. */
  onMercenary?: (lineIndex: number) => void;
}) {
  const acting = gameState.activePlayer === me.email;
  const who = displayName(gameState.activePlayer);
  const hand = me.hand || [];
  const handKey = `${gameState.turn}:${gameState.activePlayer}:${hand.join(",")}`;
  const [stagedState, setStaged] = useState<{
    key: string;
    index: number | null;
  }>({ key: "", index: null });
  // The card in the tray: a Scarecrow or Bishop waiting for its target, or what you lifted.
  const staged = pending
    ? pending.index
    : stagedState.key === handKey
      ? stagedState.index
      : null;
  const stagedCard = staged === null ? null : hand[staged];

  const fan = (enabled: boolean) => (
    <FanHand
      ariaLabel="Your hand"
      trayLabel={pending ? "Playing" : "To play"}
      disabled={!enabled || loading || !!pending}
      selected={staged === null ? [] : [`${staged}-${hand[staged]}`]}
      onToggle={(key) => {
        const index = Number(key.split("-")[0]);
        setStaged({ key: handKey, index: staged === index ? null : index });
      }}
      minWidth={50}
      maxWidth={80}
      ratio={80 / 54}
      items={hand.map((card, i) => ({
        key: `${i}-${card}`,
        label: `${CARD_LABEL[card]}`,
        title: CARD_HELP[card],
        node: (
          <CardFace
            card={card}
            width={80}
            style={{ width: "100%", height: "100%" }}
          />
        ),
      }))}
    />
  );

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
          {hand.length > 0 && fan(false)}
        </Stack>
      </div>
    );
  }

  let hint: string;
  if (loading) hint = "Sending your move…";
  else if (pending?.card === "SCARECROW")
    hint =
      "Choose which of your mercenaries the Scarecrow takes back: tap it in your line above, or use the buttons here.";
  else if (pending?.card === "BISHOP")
    hint = popeTargets(gameState).length
      ? "Every copy of the strongest mercenary on the table is discarded. Tap a region on the map to send the Pope there, or play without moving him."
      : "Every copy of the strongest mercenary on the table is discarded.";
  else if (stagedCard)
    hint = `${CARD_LABEL[stagedCard]}: ${CARD_HELP[stagedCard]} Play it, or tap it to put it back.`;
  else
    hint =
      "Tap a card to lift it, then play it. Or pass to sit out the rest of this battle.";

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
            <Button
              color="yellow"
              disabled={staged === null}
              onClick={() => staged !== null && onCard(staged)}
            >
              {stagedCard
                ? `Play ${CARD_LABEL[stagedCard]}`
                : "Pick a card below"}
            </Button>
          )}
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
        {!loading && pending?.card === "SCARECROW" && onMercenary && (
          <Group gap={6} justify="center" wrap="wrap" aria-label="Take back">
            {(me.line || []).map((card, i) =>
              isMercenary(card) ? (
                <Button
                  key={`${i}-${card}`}
                  color="yellow"
                  variant="light"
                  size="compact-md"
                  onClick={() => onMercenary(i)}
                >
                  Take back {CARD_LABEL[card]}
                </Button>
              ) : null,
            )}
          </Group>
        )}
        <Text size="sm" c="dimmed" ta="center">
          {hint}
        </Text>
        {!loading &&
          !pending &&
          !stagedCard &&
          hand.some((c) => !isMercenary(c)) && (
            <Text size="xs" c="dimmed" ta="center">
              {gameState.battlefield !== undefined
                ? `Fighting for ${REGIONS[gameState.battlefield].name}. `
                : ""}
              Scarecrows and Bishops ask where to aim before they are played.
            </Text>
          )}
        {fan(true)}
      </Stack>
    </div>
  );
}
