import { Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { LootCards, RazziaGameState } from "../types";
import LootCard from "./LootCard";
import MoneyCard from "./MoneyCard";
import displayName from "../../../shared/utils/displayName";

const CARD_WIDTH = "clamp(52px, 12vw, 84px)";
const POLICE_WIDTH = "clamp(34px, 7vw, 52px)";

/** Round, police raids laid out face up, the Money token on the board, the deck and the loot on the table. */
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
  const auction =
    gameState.roundState === "NORMAL_AUCTION" ||
    gameState.roundState === "FORCED_AUCTION";
  const raidAuction =
    gameState.roundState === "FORCED_AUCTION" && !gameState.discardIfUnsold;
  const fullTableAuction =
    gameState.roundState === "FORCED_AUCTION" && !!gameState.discardIfUnsold;
  const caller = displayName(gameState.auctionTriggeringPlayer || "");
  const raidsLeft = gameState.raidLimit - gameState.policeRaids;

  let auctionText: string | null = null;
  if (raidAuction) {
    auctionText = `${caller} revealed a police raid, so the loot is up for auction. ${caller} bids last and may pass; if nobody bids the loot stays.`;
  } else if (fullTableAuction) {
    auctionText = `Seven cards on the table: automatic auction. ${caller} bids last. If nobody bids, all seven are discarded.`;
  } else if (auction) {
    auctionText = `${caller} called an auction and bids last. If nobody else bids, ${caller} must.`;
  }

  return (
    <Stack gap="sm" align="center" w="100%">
      <Group gap="sm" justify="center">
        <Badge variant="light" radius="sm" size="lg">
          Round {gameState.round} of 3
        </Badge>
        <Badge variant="light" color="gray" radius="sm" size="lg">
          {gameState.remainingCards} in the deck
        </Badge>
      </Group>

      {auctionText && (
        <Paper
          withBorder
          radius="md"
          px="md"
          py="xs"
          style={{
            borderColor: "var(--mantine-color-yellow-5)",
            background: "rgba(255, 216, 107, 0.08)",
          }}
          data-testid="auction-banner"
        >
          <Text size="sm" ta="center" fw={600}>
            {raidAuction
              ? "Police raid: normal auction"
              : fullTableAuction
                ? "Automatic auction"
                : "Auction"}
          </Text>
          <Text size="xs" ta="center" c="dimmed">
            {auctionText}
          </Text>
        </Paper>
      )}

      {/* police raids laid out face up, with empty slots up to the one that ends the round. */}
      <Stack gap={4} align="center" w="100%">
        <Text size="xs" c="dimmed">
          Police raids: {gameState.policeRaids} of {gameState.raidLimit}.{" "}
          {raidsLeft === 1
            ? "The next one ends the round."
            : `${raidsLeft} more end the round.`}
        </Text>
        <Group gap={4} justify="center" wrap="wrap" aria-label="Police raids">
          {Array.from({ length: gameState.raidLimit }, (_, i) =>
            i < gameState.policeRaids ? (
              <LootCard
                key={i}
                card="POLICE_RAIDS"
                width={POLICE_WIDTH}
                highlighted={raidAuction && i === gameState.policeRaids - 1}
              />
            ) : (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  width: POLICE_WIDTH,
                  aspectRatio: "290 / 440",
                  borderRadius: 6,
                  border: "2px dashed rgba(255, 90, 90, 0.5)",
                  flex: "0 0 auto",
                }}
              />
            ),
          )}
        </Group>
      </Stack>

      <Group gap="md" align="flex-start" justify="center" wrap="wrap" w="100%">
        <Stack gap={2} align="center">
          <MoneyCard amount={gameState.money} width={64} />
          <Text size="xs" c="dimmed" ta="center">
            Money token
            <br />
            on the board
          </Text>
        </Stack>

        <Stack gap={4} align="center" style={{ flex: "1 1 220px" }}>
          <Text size="sm" c="dimmed">
            {loot.length === 0
              ? "No loot on the table yet"
              : `${loot.length} of 7 loot cards on the table${
                  selectable ? ". Pick what to steal." : ""
                }`}
          </Text>
          <Group gap={6} justify="center" wrap="wrap" data-testid="loot-table">
            {loot.map((card, index) => (
              <LootCard
                key={`${card}-${index}`}
                card={card}
                width={CARD_WIDTH}
                caption
                selected={selected.includes(index)}
                onClick={
                  selectable && onToggle ? () => onToggle(index) : undefined
                }
              />
            ))}
          </Group>
        </Stack>
      </Group>
    </Stack>
  );
}
