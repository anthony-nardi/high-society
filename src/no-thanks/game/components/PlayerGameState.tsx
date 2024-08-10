import { useMemo } from "react";
import { NoThanksPlayerState } from "../types";
import { Flex } from "@mantine/core";
import PlayerActions from "./PlayerActions";
import { useUserContext } from "../../../shared/context/useUserContext";
import PlayerChips from "./player/PlayerChips";
import PlayerInfo from "./player/PlayerInfo";
import PlayerCards from "./player/PlayerCards";

interface PlayerGameStateProps {
  player: NoThanksPlayerState;
  activePlayer: string;
}

export default function PlayerGameState({
  player,
  activePlayer,
}: PlayerGameStateProps) {
  const { user } = useUserContext();
  const { email, cards, chips } = player;

  const isLoggedInUserActivePlayer = useMemo(() => {
    const isActivePlayer = email === activePlayer;
    return user && user.email === activePlayer && isActivePlayer;
  }, [user, email, activePlayer]);

  return (
    <>
      <Flex style={{ marginBottom: "12px" }}>
        <PlayerInfo email={email} />
        <PlayerActions
          isLoggedInUserActivePlayer={!!isLoggedInUserActivePlayer}
          chipsRemaining={chips}
        />
      </Flex>
      <PlayerCards cards={cards} />
      {user && user.email === email ? <PlayerChips chips={chips} /> : null}
    </>
  );
}
