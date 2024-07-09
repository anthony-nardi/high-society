import { User } from "firebase/auth";
import { LobbyData } from "../types";
import { useCallback, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Box, Button, Center, Grid } from "@mantine/core";

export default function PlayersList({
  players,
  user,
  lobbyUID,
}: {
  players: LobbyData["players"];
  user: User;
  lobbyUID: string;
}) {
  const handleReadyUp = useCallback(() => {
    const functions = getFunctions();

    const readyUp = httpsCallable<any, any>(functions, "readyup");

    readyUp({
      email: user.email,
      lobbyUID,
    });
  }, [lobbyUID, user.email]);

  const renderCurrentPlayerStatus = useMemo(() => {
    const currentPlayer = players.find((player) => player.email === user.email);
    if (currentPlayer && currentPlayer.ready) {
      return (
        <Box ml="sm">
          <b>Waiting for others...</b>
        </Box>
      );
    }

    return (
      <Button
        styles={{ root: { "margin-left": "12px" } }}
        onClick={handleReadyUp}
      >
        Ready?
      </Button>
    );
  }, [players, user, handleReadyUp]);

  const renderedUsers = useMemo(() => {
    return players.map((player) => {
      return (
        <Grid.Col span={{ base: 12, md: 12, lg: 12 }}>
          <Center>
            <span>{player.email}</span>
            {player.email === user.email ? (
              renderCurrentPlayerStatus
            ) : player.ready ? (
              <Box ml="sm">
                <b>Waiting for others...</b>
              </Box>
            ) : (
              <span>Not ready</span>
            )}
          </Center>
        </Grid.Col>
      );
    });
  }, [players, user, renderCurrentPlayerStatus]);

  return <Grid>{renderedUsers}</Grid>;
}
