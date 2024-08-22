import { useMemo } from "react";
import { useUserContext } from "../../../shared/context/useUserContext";
import { RazziaPlayerState } from "../types";
import { Flex } from "@mantine/core";
import PlayerInfo from "./PlayerInfo";
import PlayerActions from "./PlayerActions";
import PlayerCards from "./PlayerCards";
import PlayerMoney from "./PlayerMoney";

interface PlayerGameStateProps {
  player: RazziaPlayerState;
  activePlayer: string;
}

export default function PlayerGameState({
  player,
  activePlayer,
}: PlayerGameStateProps) {
  const { user } = useUserContext();

  const { email } = player;

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
        />
      </Flex>
      <PlayerCards />
      <PlayerMoney
        availableMoney={player.availableMoney}
        money={player.money}
      />
    </>
  );
}
