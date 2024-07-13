import { Box, Flex } from "@mantine/core";
import { GameState, PlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRountState";
import { useMemo } from "react";
import { User } from "firebase/auth";

export default function PlayerOverview({
  player,
  activePlayer,
  lobbyId,
  user,
}: {
  player: PlayerState;
  activePlayer: GameState["activePlayer"];
  lobbyId: string;
  user: User;
}) {
  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  const isLoggedInUserActivePlayer = useMemo(() => {
    return user.email === activePlayer && isActivePlayer;
  }, [user.email, activePlayer]);

  return (
    <Flex justify="space-between">
      <Box>
        <PlayerGameState player={player} />
      </Box>

      <Box w={"50%"}>
        <PlayerRoundState
          isActivePlayer={isActivePlayer}
          player={player}
          lobbyId={lobbyId}
          isLoggedInUserActivePlayer={isLoggedInUserActivePlayer}
        />
      </Box>
    </Flex>
  );
}
