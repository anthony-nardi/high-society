import { Badge, Box, Group, Stack, Text } from "@mantine/core";
import { RazziaGameState, RazziaPlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import { CATEGORY_LABELS, CATEGORY_ORDER, totalCards } from "../cardInfo";
import LootCard from "./LootCard";
import MoneyCard from "./MoneyCard";

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
      {isActivePlayer && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser
            ? "Your turn"
            : isBotName(player.email)
              ? "Bot thinking…"
              : "Their turn"}
        </Badge>
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
          {auction && bid && (
            <Badge color="yellow" radius="sm">
              Bid {bid}
            </Badge>
          )}
          {auction && player.email === gameState.auctionTriggeringPlayer && (
            <Badge variant="outline" color="gray" radius="sm">
              Bids last
            </Badge>
          )}
        </Group>
      </Group>

      <Stack gap={4} mt="xs">
        {CATEGORY_ORDER.filter(
          (category) => (player.cards?.[category] || []).length > 0,
        ).map((category) => {
          const cards = player.cards[category] || [];
          return (
            <Group key={category} gap={4} align="center" wrap="wrap">
              <Text size="xs" c="dimmed" w={78}>
                {CATEGORY_LABELS[category]} ({cards.length})
              </Text>
              {cards.map((card, index) => (
                <LootCard key={`${card}-${index}`} card={card} width={30} />
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
