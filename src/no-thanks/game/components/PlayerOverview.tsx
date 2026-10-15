import { Badge, Box } from "@mantine/core";
import { NoThanksGameState, NoThanksPlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import { useUserContext } from "../../../shared/context/useUserContext";
import { isBotName } from "../../../shared/utils/displayName";

export default function PlayerOverview({
  player,
  activePlayer,
}: {
  player: NoThanksPlayerState;
  activePlayer: NoThanksGameState["activePlayer"];
}) {
  const { user } = useUserContext();
  const isActivePlayer = player.email === activePlayer;
  const isCurrentUser = !!user && player.email === user.email;

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
      <PlayerGameState player={player} />
    </Box>
  );
}
