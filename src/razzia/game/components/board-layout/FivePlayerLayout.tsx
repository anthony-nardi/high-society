import { Grid } from "@mantine/core";
import { RazziaPlayerState } from "../../types";
import PlayerOverview from "../PlayerOverview";
import { useUserContext } from "../../../../shared/context/useUserContext";
import { useMemo } from "react";

export default function FivePlayerLayout({
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
      <Grid.Col span={{ base: 12, md: 4 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[0]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[1]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[2]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={12} style={{ border: "1px solid red" }}>
        THIS IS THE CENTER
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[3]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 8 }} style={{ border: "1px solid red" }}>
        <PlayerOverview
          player={playersListWithLoggedInUserAsLast[4]}
          activePlayer={activePlayer}
        />
      </Grid.Col>
    </Grid>
  );
}
