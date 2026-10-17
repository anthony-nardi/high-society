import { Badge, Box, Group, Text } from "@mantine/core";
import { ForSaleGameState, ForSalePlayerState } from "../types";
import { useUserContext } from "../../../shared/context/useUserContext";
import displayName, { isBotName } from "../../../shared/utils/displayName";
import ThinkingDots from "../../../shared/components/ThinkingDots";
import PropertyCard from "./PropertyCard";
import ChequeCard from "./ChequeCard";
import { chequeTotal, money } from "../money";

export default function PlayerOverview({
  player,
  gameState,
}: {
  player: ForSalePlayerState;
  gameState: ForSaleGameState;
}) {
  const { user } = useUserContext();
  const isCurrentUser = !!user && player.email === user.email;
  const isBot = isBotName(player.email);
  const buying = gameState.phase === "BUYING";
  const waitingOn = buying
    ? player.email === gameState.activePlayer
    : !(gameState.chosen || []).includes(player.email);
  const chosen = !buying && (gameState.chosen || []).includes(player.email);
  const properties = player.properties || [];
  const cheques = player.cheques || [];

  let status: React.ReactNode = null;
  if (buying && player.passed) {
    status = (
      <Badge color="gray" variant="light" radius="sm">
        Out: took #{properties[properties.length - 1]}
      </Badge>
    );
  } else if (buying && player.bid > 0) {
    status = (
      <Badge
        color={player.email === gameState.highBidder ? "yellow" : "gray"}
        variant="light"
        radius="sm"
      >
        Bid {money(player.bid)}
      </Badge>
    );
  } else if (chosen) {
    status = (
      <Badge color="green" variant="light" radius="sm">
        Chosen
      </Badge>
    );
  }

  return (
    <Box
      p="sm"
      data-testid="player-overview"
      style={{
        position: "relative",
        borderRadius: 12,
        border: waitingOn
          ? "2px solid var(--mantine-color-yellow-5)"
          : "2px solid transparent",
        boxShadow: waitingOn ? "0 0 14px rgba(255, 216, 107, 0.45)" : undefined,
        background: waitingOn
          ? "rgba(255, 216, 107, 0.06)"
          : "var(--mantine-color-default)",
        transition: "border-color 200ms, box-shadow 200ms",
        minWidth: 0,
      }}
    >
      {waitingOn && (
        <Badge
          color="yellow"
          variant="filled"
          radius="sm"
          style={{ position: "absolute", top: -10, left: 12 }}
        >
          {isCurrentUser ? (
            "Your turn"
          ) : isBot ? (
            <>
              Thinking
              <ThinkingDots />
            </>
          ) : buying ? (
            "Their turn"
          ) : (
            "Choosing"
          )}
        </Badge>
      )}
      <Group justify="space-between" align="center" wrap="wrap" gap="xs" mt={4}>
        <Group gap="xs" align="baseline" wrap="wrap">
          <Text fw={700} truncate>
            {displayName(player.email)}
            {isCurrentUser && (
              <Text component="span" c="dimmed" fw={400}>
                {" "}
                (you)
              </Text>
            )}
          </Text>
          {status}
        </Group>
        {isCurrentUser ? (
          <Text
            size="sm"
            fw={600}
            aria-label={`${money(player.money)} in cash`}
          >
            {money(player.money)}
            <Text component="span" c="dimmed" fw={400}>
              {" "}
              cash
            </Text>
          </Text>
        ) : (
          <Text size="xs" c="dimmed">
            {cheques.length} cheque{cheques.length === 1 ? "" : "s"}
          </Text>
        )}
      </Group>
      <Group
        gap={4}
        mt={6}
        wrap="wrap"
        aria-label={`${displayName(player.email)}'s properties`}
      >
        {properties.length === 0 ? (
          <Text size="xs" c="dimmed">
            No properties yet
          </Text>
        ) : (
          properties.map((p) => (
            <PropertyCard key={p} property={p} width={40} />
          ))
        )}
      </Group>
      {isCurrentUser && cheques.length > 0 && (
        <Group
          gap={4}
          mt={6}
          wrap="wrap"
          aria-label={`Your cheques, ${money(chequeTotal(player))} in all`}
        >
          {cheques.map((c, i) => (
            <ChequeCard key={i} amount={c} width={36} />
          ))}
          <Text size="xs" c="dimmed" ml={4}>
            {money(chequeTotal(player))} in cheques
          </Text>
        </Group>
      )}
    </Box>
  );
}
