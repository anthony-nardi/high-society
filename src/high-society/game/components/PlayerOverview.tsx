import { Box, Flex } from "@mantine/core";
import { HighSocietyGameState, HighSocietyPlayerState } from "../types";
import PlayerGameState from "./PlayerGameState";
import PlayerRoundState from "./PlayerRoundState";
import { useMemo } from "react";
import { useUserContext } from "../../../shared/context/useUserContext";

export default function PlayerOverview({
  player,
  activePlayer,
}: {
  player: HighSocietyPlayerState;
  activePlayer: HighSocietyGameState["activePlayer"];
}) {
  const { user } = useUserContext();

  const isActivePlayer = useMemo(() => {
    return player.email === activePlayer;
  }, [player, activePlayer]);

  const styles = useMemo(() => {
    if (isActivePlayer) {
      return {
        root: {
          border: "2px solid #dadada",
          borderRadius: "12px",
          boxShadow: "0 0 8px #9ecaed",
        },
      };
    }
  }, [isActivePlayer]);

  return (
    <Flex p="md" justify="space-between" styles={styles} key={player.email}>
      <Box>
        <PlayerGameState
          player={player}
          loggedInUser={(user && user.email) || ""}
        />
      </Box>

      <Box w={"40%"}>
        <PlayerRoundState player={player} />
      </Box>
    </Flex>
  );
}
