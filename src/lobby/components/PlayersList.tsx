import { LobbyData } from "../types";
import { useMemo } from "react";
import { Badge, Center } from "@mantine/core";

export default function PlayersList({
  players,
}: {
  players: LobbyData["players"];
}) {
  const renderedUsers = useMemo(() => {
    return players.map((player) => {
      const rootStyle = {
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
          key={player.email}
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
