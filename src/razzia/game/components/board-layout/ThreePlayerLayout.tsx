import { Grid } from "@mantine/core";
import { RazziaPlayerState } from "../../types";
import PlayerOverview from "../PlayerOverview";
import { useUserContext } from "../../../../shared/context/useUserContext";
import { useMemo } from "react";
import SharedBoard from "../SharedBoard";

export default function ThreePlayerLayout({
  players,
  activePlayer,
}: {
  players: RazziaPlayerState[];
  activePlayer: string;
}) {
  const { user } = useUserContext();

  const playersListWithLoggedInUserAsLast = useMemo(() => {
    if (!players) {
      return [];
    }

    const loggedInUser = players.find((player) => player.email === user?.email);

    if (!loggedInUser) {
      return players;
    }

    const otherPlayers = players.filter(
      (player) => player.email !== user?.email
    );

    return [...otherPlayers, loggedInUser];
  }, [players, user?.email]);

  return (
    <Grid gutter={{ base: 5, xs: "md", md: "xl", xl: 50 }}>
      <Grid.Col span={{ base: 12, md: 6 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[0]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 6 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[1]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={12} style={{ border: "1px solid red" }}>
        <SharedBoard />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 12 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[2]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
    </Grid>
  );
}
