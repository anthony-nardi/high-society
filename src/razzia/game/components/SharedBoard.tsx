import { Badge, Group, Stack, Text } from "@mantine/core";
import { LootCards, RazziaGameState } from "../types";
import LootCard from "./LootCard";
import MoneyCard from "./MoneyCard";
import displayName from "../../../shared/utils/displayName";

/** Round, police raid track, centre money, the deck and the loot on the table. */
export default function SharedBoard({
  gameState,
  selectable = false,
  selected = [],
  onToggle,
}: {
  gameState: RazziaGameState;
  /** When true, revealed loot can be picked (for a thief). */
  selectable?: boolean;
  selected?: number[];
  onToggle?: (index: number) => void;
}) {
  const loot = (gameState.revealedCards || []).filter(
    (card): card is LootCards => card !== "POLICE_RAIDS",
  );
  const raids = Array.from(
    { length: gameState.raidLimit },
    (_, i) => i < gameState.policeRaids,
  );
  const auction =
    gameState.roundState === "NORMAL_AUCTION" ||
    gameState.roundState === "FORCED_AUCTION";

  return (
    <Stack gap="sm" align="center" w="100%">
      <Group gap="sm" justify="center">
        <Badge variant="light" radius="sm" size="lg">
          Round {gameState.round} of 3
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          {gameState.remainingCards} cards left
        </Badge>
        {auction && (
          <Badge color="yellow" radius="sm" size="lg">
            {gameState.roundState === "FORCED_AUCTION"
              ? "Forced auction"
              : "Auction"}{" "}
            called by {displayName(gameState.auctionTriggeringPlayer || "")}
          </Badge>
        )}
      </Group>

      <Group gap={6} justify="center" aria-label="Police raid track">
        <Text size="sm" c="dimmed">
          Police raids
        </Text>
        {raids.map((hit, index) => (
          <span
            key={index}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: hit ? "var(--mantine-color-red-6)" : "transparent",
              border: "2px solid var(--mantine-color-red-6)",
              display: "inline-block",
            }}
          />
        ))}
        <Text size="sm" c="dimmed">
          {gameState.policeRaids} / {gameState.raidLimit}
        </Text>
      </Group>

      <Group gap="md" align="center" justify="center">
        <Stack gap={2} align="center">
          <MoneyCard amount={gameState.money} width={64} />
          <Text size="xs" c="dimmed">
            Centre money
          </Text>
        </Stack>
        <Stack gap={2} align="center">
          <div
            style={{
              width: 64,
              aspectRatio: "290 / 440",
              borderRadius: 8,
              background:
                "repeating-linear-gradient(135deg, #2a5a3a 0 6px, #244d32 6px 12px)",
              border: "3px solid #1b3a25",
            }}
            role="img"
            aria-label={`Deck, ${gameState.remainingCards} cards`}
          />
          <Text size="xs" c="dimmed">
            Deck
          </Text>
        </Stack>
      </Group>

      <Stack gap={4} align="center" w="100%">
        <Text size="sm" c="dimmed">
          {loot.length === 0
            ? "No loot on the table yet"
            : `${loot.length} of 7 loot cards on the table${selectable ? ". Pick what to steal." : ""}`}
        </Text>
        <Group gap={6} justify="center" wrap="wrap" data-testid="loot-table">
          {loot.map((card, index) => (
            <LootCard
              key={`${card}-${index}`}
              card={card}
              width="clamp(44px, 11vw, 76px)"
              selected={selected.includes(index)}
              onClick={selectable && onToggle ? () => onToggle(index) : undefined}
            />
          ))}
        </Group>
      </Stack>
    </Stack>
  );
}
