import { User } from "firebase/auth";
import { LobbyData } from "../types";
import { useCallback, useMemo } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Badge, Box, Button, Center, Flex, Grid } from "@mantine/core";

export default function PlayersList({
  players,
  user,
  lobbyUID,
}: {
  players: LobbyData["players"];
  user: User;
  lobbyUID: string;
}) {
  const renderedUsers = useMemo(() => {
    return players.map((player) => {
      let rootStyle = {
        border: "1px solid red",
        padding: "32px",
        borderRadius: "8px",
        marginBottom: "8px",
      };
      if (player.ready) {
        rootStyle.border = "1px solid green";
      }

      return (
        <Center
          styles={{
            root: rootStyle,
          }}
        >
          <span>{player.email}</span>
          <Badge
            autoContrast
            ml="xl"
            variant="outline"
            color={player.ready ? "green" : "red"}
            size="xl"
            radius="sm"
          >
            {player.ready ? <span>Ready</span> : <span>Not Ready</span>}
          </Badge>
        </Center>
      );
    });
  }, [players]);

  return <>{renderedUsers}</>;
}
