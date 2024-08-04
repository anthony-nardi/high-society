import { Box } from "@mantine/core";
import { LobbyData } from "../types";
import { GameName } from "../../../high-society/client/createLobby";

export default function ConnectedPlayersCount({
  players,
  gameName,
}: {
  players: LobbyData["players"];
  gameName: GameName;
}) {
  const maxPlayers = gameName === "high-society" ? 5 : 7;

  if (players.length < 3) {
    return (
      <Box color="red">
        {players.length} / {maxPlayers}
      </Box>
    );
  }

  return (
    <Box color="green">
      {players.length} / {maxPlayers}
    </Box>
  );
}
