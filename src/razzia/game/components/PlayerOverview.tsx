import { Badge, Box, Group, Stack, Text } from "@mantine/core";
import { LootCards, RazziaGameState, RazziaPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { CATEGORY_LABELS, CATEGORY_ORDER, totalCards } from "../cardInfo";
import LootCard from "./LootCard";
import MoneyCard from "./MoneyCard";
import formatMoney from "../money";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: RazziaPlayerState;
  gameState: RazziaGameState;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === gameState.activePlayer;
  const isCurrentUser = !!user && player.email === user.email;
  const money = [...(player.money || [])].sort((a, b) => Number(a) - Number(b));
  const available = player.availableMoney || [];
  const bid = Number(player.bid) > 0 ? player.bid : null;
  const auction =
    gameState.roundState === "NORMAL_AUCTION" ||
    gameState.roundState === "FORCED_AUCTION";
  const passed = (gameState.auctionPassed || []).includes(player.email);
  const isCaller = player.email === gameState.auctionTriggeringPlayer;
  const sittingOut = available.length === 0;

  // What this player has done in the auction so far, or that they are out
  // of Money tokens for the rest of the round.
  let auctionStatus: {
    label: string;
    color: string;
    variant: "filled" | "light" | "outline";
  } | null = null;
  if (bid) {
    auctionStatus = {
      label: `Bid ${formatMoney(bid)}`,
      color: "yellow",
      variant: "filled",
    };
  } else if (sittingOut && gameState.status === "IN_PROGRESS") {
    auctionStatus = {
      label: "Sitting out: no tokens left",
      color: "gray",
      variant: "outline",
    };
  } else if (auction) {
    if (passed)
      auctionStatus = { label: "Passed", color: "gray", variant: "light" };
    else if (isCaller)
      auctionStatus = { label: "Bids last", color: "gray", variant: "outline" };
    else
      auctionStatus = {
        label: "Yet to bid",
        color: "blue",
        variant: "outline",
      };
  }

  return (
    <Box
      p="md"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: isActivePlayer
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: isActivePlayer
          ? "0 0 14px rgba(255, 216, 107, 0.45)"
          : undefined,
        background: isActivePlayer
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
      }}
    >
      {(auctionStatus || isActivePlayer) && (
        <Group
          gap={6}
          wrap="nowrap"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {auctionStatus && (
            <Badge
              color={auctionStatus.color}
              variant={auctionStatus.variant}
              radius="sm"
              data-testid="auction-status"
              style={{
                background:
                  auctionStatus.variant === "outline"
                    ? "var(--mantine-color-body)"
                    : undefined,
              }}
            >
              {auctionStatus.label}
            </Badge>
          )}
          {isActivePlayer && (
            <Badge color="yellow" variant="filled" radius="sm">
              {isCurrentUser
                ? "Your turn"
                : isBotName(player.email)
                  ? "Bot thinking…"
                  : "Their turn"}
            </Badge>
          )}
        </Group>
      )}

      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <div>
          <Text fw={700}>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          <Text size="sm" c="dimmed">
            {player.score} point{player.score === 1 ? "" : "s"} ·{" "}
            {totalCards(player.cards)} card
            {totalCards(player.cards) === 1 ? "" : "s"}
          </Text>
        </div>
        <Group
          gap={4}
          wrap="wrap"
          aria-label={`${displayName(player.email)}'s money`}
        >
          {money.map((amount, index) => (
            <MoneyCard
              key={`${amount}-${index}`}
              amount={amount}
              available={available.includes(amount)}
              selected={auction && bid === amount}
              width={44}
            />
          ))}
        </Group>
      </Group>

      <Stack gap={4} mt="xs">
        {CATEGORY_ORDER.filter(
          (category) => (player.cards?.[category] || []).length > 0,
        ).map((category) => {
          const cards = player.cards[category] || [];
          // Jewels and businesses differ by kind, so show each kind once with
          // a count; the other suits are all the same card.
          const counts = new Map<LootCards, number>();
          for (const card of cards)
            counts.set(card, (counts.get(card) || 0) + 1);
          return (
            <Group key={category} gap={6} align="center" wrap="wrap">
              <Text size="xs" c="dimmed" w={78}>
                {CATEGORY_LABELS[category]} ({cards.length})
              </Text>
              {[...counts.entries()].map(([card, n]) => (
                <div key={card} style={{ position: "relative" }}>
                  <LootCard card={card} width={34} />
                  {n > 1 && (
                    <Badge
                      size="xs"
                      circle
                      color="dark"
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -8,
                        border: "1px solid var(--mantine-color-default-border)",
                      }}
                    >
                      {n}
                    </Badge>
                  )}
                </div>
              ))}
            </Group>
          );
        })}
        {totalCards(player.cards) === 0 && (
          <Text size="xs" c="dimmed">
            No loot yet
          </Text>
        )}
      </Stack>
    </Box>
  );
}
