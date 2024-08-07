import { Box } from "@mantine/core";
import { LobbyData } from "../types";
import { GameName } from "../../../high-society/client/createLobby";

interface ConnectedPlayersCountProps {
  players: LobbyData["players"];
  gameName: GameName;
}

const getColor = (playerCount: number) => (playerCount < 3 ? "red" : "green");

const getMaxPlayers = (gameName: GameName): number => {
  switch (gameName) {
    case "high-society":
      return 5;
    case "no-thanks":
      return 7;
    default:
      return 0; // Default case, should never happen
  }
};

export default function ConnectedPlayersCount({
  players,
  gameName,
}: ConnectedPlayersCountProps) {
  const maxPlayers = getMaxPlayers(gameName);
  const color = getColor(players.length);

  return (
    <Box color={color}>
      {players.length} / {maxPlayers}
    </Box>
  );
}
