import { Badge, Group, Paper, Stack, Table, Text } from "@mantine/core";
import { LootCards, RazziaGameState, RazziaPlayerState } from "../types";
import LootCard from "./LootCard";
import MoneyCard from "./MoneyCard";
import displayName from "../../../shared/utils/displayName";
import { tableValue } from "../tableValue";

const CARD_WIDTH = "clamp(52px, 12vw, 84px)";
const POLICE_WIDTH = "clamp(34px, 7vw, 52px)";

/** Round, police raids laid out as cards, centre money, the deck and the loot on the table. */
export default function SharedBoard({
  gameState,
  viewer,
  selectable = false,
  selected = [],
  onToggle,
}: {
  gameState: RazziaGameState;
  /** The logged-in player, for the "worth to you" breakdown. */
  viewer: RazziaPlayerState | null;
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
  const value = viewer ? tableValue(loot, viewer, gameState.players) : null;

  let auctionText: string | null = null;
  if (raidAuction) {
    auctionText = `${caller} drew a police raid, so the loot is up for auction. ${caller} bids last and may pass; if nobody bids the loot stays.`;
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
              ? "Police raid: forced auction"
              : fullTableAuction
                ? "Automatic auction"
                : "Auction"}
          </Text>
          <Text size="xs" ta="center" c="dimmed">
            {auctionText}
          </Text>
        </Paper>
      )}

      {/* Police raids laid out as cards, with empty slots up to the one that ends the round. */}
      <Stack gap={4} align="center" w="100%">
        <Text size="xs" c="dimmed">
          Police raids: {gameState.policeRaids} of {gameState.raidLimit}.{" "}
          {raidsLeft === 1
            ? "The next one ends the round."
            : `${raidsLeft} more end the round.`}
        </Text>
        <Group
          gap={4}
          justify="center"
          wrap="wrap"
          aria-label="Police raid cards"
        >
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
            Centre cheque
            <br />
            goes to the winner
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

      {value && loot.length > 0 && (
        <Paper
          withBorder
          radius="md"
          p="xs"
          w="100%"
          maw={480}
          data-testid="table-value"
        >
          <Text size="xs" c="dimmed" mb={4}>
            If you won this table
          </Text>
          <Table verticalSpacing={2} fz="xs" withRowBorders={false}>
            <Table.Tbody>
              {value.lines.map((line) => (
                <Table.Tr key={line.label}>
                  <Table.Td fw={600} w={110}>
                    {line.label}
                  </Table.Td>
                  <Table.Td>
                    {line.what}
                    {line.note && (
                      <Text component="span" c="dimmed">
                        {" "}
                        · {line.note}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td
                    ta="right"
                    w={90}
                    fw={600}
                    c={
                      line.delta > 0
                        ? "green.4"
                        : line.delta < 0
                          ? "red.4"
                          : "dimmed"
                    }
                  >
                    {line.delta > 0 ? "+" : ""}
                    {line.delta}
                    <Text component="span" c="dimmed" fw={400}>
                      {line.when === "end" ? " at end" : ""}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              <Table.Tr>
                <Table.Td fw={700}>Total</Table.Td>
                <Table.Td>
                  <Text component="span" c="dimmed">
                    plus the {gameState.money} cheque
                  </Text>
                </Table.Td>
                <Table.Td
                  ta="right"
                  fw={700}
                  c={
                    value.total > 0
                      ? "green.4"
                      : value.total < 0
                        ? "red.4"
                        : undefined
                  }
                >
                  {value.total > 0 ? "+" : ""}
                  {value.total}
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Stack>
  );
}
