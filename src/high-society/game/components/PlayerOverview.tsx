import { Badge, Box, Flex } from "@mantine/core";
import { HighSocietyGameState, HighSocietyPlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRoundState";
import { useUserContext } from "../../../shared/context/useUserContext";
import { isBotName } from "../../../shared/utils/displayName";

export default function PlayerOverview({
  player,
  activePlayer,
  highestBidTotal,
}: {
  player: HighSocietyPlayerState;
  activePlayer: HighSocietyGameState["activePlayer"];
  highestBidTotal: number;
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === activePlayer;
  const isCurrentUser = !!user && player.email === user.email;

  return (
    <Flex
      p="md"
      gap="md"
      justify="space-between"
      wrap="wrap"
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
      <Box>
        <PlayerGameState
          player={player}
          loggedInUser={(user && user.email) || ""}
        />
      </Box>

      <Box miw={160}>
        <PlayerRoundState player={player} highestBidTotal={highestBidTotal} />
      </Box>
    </Flex>
  );
}
