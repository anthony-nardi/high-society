import { Box } from "@mantine/core";
import { LobbyData } from "../types";

export default function ConnectedPlayersCount({
  players,
}: {
  players: LobbyData["players"];
}) {
  if (players.length < 3) {
    return <Box color="red">{players.length} / 5</Box>;
  }

  return <Box color="green">{players.length} / 5</Box>;
}
