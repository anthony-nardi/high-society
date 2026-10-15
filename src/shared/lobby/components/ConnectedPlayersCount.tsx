import { Text } from "@mantine/core";
import { LobbyPlayer } from "../types";
import { GameName } from "../../../high-society/client/createLobby";
import { getMaxPlayers, MIN_PLAYERS } from "../playerLimits";

interface ConnectedPlayersCountProps {
  players: LobbyPlayer[];
  gameName: GameName;
}

export default function ConnectedPlayersCount({
  players,
  gameName,
}: ConnectedPlayersCountProps) {
  const maxPlayers = getMaxPlayers(gameName);
  const missing = Math.max(0, MIN_PLAYERS - players.length);

  return (
    <div>
      <Text fw={600}>
        {players.length} / {maxPlayers} players
      </Text>
      <Text size="sm" c="dimmed">
        {missing > 0
          ? `Need ${missing} more to start`
          : "Starts when everyone is ready"}
      </Text>
    </div>
  );
}
