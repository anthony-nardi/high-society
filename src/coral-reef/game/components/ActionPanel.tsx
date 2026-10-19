import { Badge, Button, Group, Loader, Stack, Text } from "@mantine/core";
import { CardType, CoralReefGameState, CoralReefPlayerState } from "../types";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import FanHand from "../../../shared/components/FanHand";
import CardFace from "./CardFace";
import { CARD_INFO, hasChosen, label } from "../board";
import classes from "./ActionPanel.module.css";

/**
 * What you are in the middle of: a card lifted, a cell chosen, and for an
 * Octopus the card picked up and where it goes (another card to swap with,
 * or an empty cell to move to).
 */
export type Draft = {
  card: number | null;
  cell: string | null;
  pick: string | null;
  swapWith: string | null;
  moveTo: string | null;
};

/** Fixed strip: your hand fanned, the chosen cell and any Octopus shuffle, and the place button. */
export default function ActionPanel({
  gameState,
  me,
  draft,
  loading,
  onCard,
  onPlace,
  onClearShuffle,
  onCancel,
}: {
  gameState: CoralReefGameState;
  me: CoralReefPlayerState;
  draft: Draft;
  loading: boolean;
  onCard: (index: number) => void;
  onPlace: () => void;
  onClearShuffle: () => void;
  onCancel: () => void;
}) {
  const hand = me.hand || [];
  const chosen = hasChosen(gameState, me.email);
  const waitingFor = gameState.players
    .filter((p) => !hasChosen(gameState, p.email) && (p.hand || []).length > 0)
    .map((p) => p.email);
  const card: CardType | null =
    draft.card === null ? null : (hand[draft.card] ?? null);
  const octopus = card === "OCTOPUS";
  const shuffling = draft.pick !== null && !draft.swapWith && !draft.moveTo;
  const ready = draft.card !== null && draft.cell !== null && !shuffling;

  const fan = (enabled: boolean) => (
    <FanHand
      ariaLabel="Your hand"
      trayLabel="To place"
      disabled={!enabled || loading}
      selected={
        draft.card === null ? [] : [`${draft.card}-${hand[draft.card]}`]
      }
      onToggle={(key) => onCard(Number(key.split("-")[0]))}
      minWidth={46}
      maxWidth={72}
      ratio={1.3}
      items={hand.map((type, i) => ({
        key: `${i}-${type}`,
        label: label(type),
        title: `${label(type)}: ${CARD_INFO[type].rule}`,
        node: (
          <CardFace
            type={type}
            size={72}
            style={{ width: "100%", height: "100%" }}
          />
        ),
      }))}
    />
  );

  if (chosen || hand.length === 0) {
    return (
      <div
        className={`${classes.panel} ${classes.compact} safe-bottom`}
        data-testid="action-panel"
      >
        <Stack gap={4} align="center">
          <Text size="sm" c="dimmed" ta="center">
            {loading ? (
              <>
                Sending your choice
                <ThinkingDots />
              </>
            ) : (
              <>
                Chosen. Waiting for{" "}
                {waitingFor.map(displayName).join(", ") || "the others"}.
                {waitingFor.some(isBotName) && <ThinkingDots />}
              </>
            )}
          </Text>
          {hand.length > 0 && fan(false)}
        </Stack>
      </div>
    );
  }

  let hint: string;
  if (loading) hint = "Sending your choice…";
  else if (draft.card === null)
    hint =
      "Tap a card to lift it. Everyone picks at once; the rest of your hand passes on.";
  else if (draft.cell === null)
    hint = `${label(card as CardType)}: ${CARD_INFO[card as CardType].rule} Tap a glowing cell in your reef.`;
  else if (octopus && draft.pick === null)
    hint =
      "An Octopus may shuffle your reef: tap a card to pick it up, then tap another card to swap with it or a lit empty cell to move it there. Or place without shuffling.";
  else if (octopus && shuffling)
    hint =
      "Now tap another card to swap with, or a lit empty cell to move it to. Clear to pick a different card.";
  else hint = "Place it, or tap the card to put it back.";

  const what = octopus
    ? draft.swapWith
      ? " and swap"
      : draft.moveTo
        ? " and move"
        : ""
    : "";

  return (
    <div
      className={`${classes.panel} ${classes.active} safe-bottom`}
      data-testid="action-panel"
    >
      <Stack gap={6} align="center">
        <Group gap="sm" justify="center" wrap="wrap">
          <Badge color="yellow" variant="filled" radius="sm" size="lg">
            Round {gameState.round} · pick {gameState.pick + 1} of 10
          </Badge>
          {loading && <Loader size="xs" color="yellow" />}
          {!loading && ready && (
            <Button color="yellow" size="sm" onClick={onPlace}>
              Place {label(card as CardType)}
              {what}
            </Button>
          )}
          {!loading && octopus && draft.pick !== null && (
            <Button variant="default" size="xs" onClick={onClearShuffle}>
              Clear shuffle
            </Button>
          )}
          {!loading && draft.card !== null && (
            <Button variant="default" size="xs" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Group>
        <Text size="sm" c="dimmed" ta="center" data-testid="hint">
          {hint}
        </Text>
        {fan(true)}
      </Stack>
    </div>
  );
}
