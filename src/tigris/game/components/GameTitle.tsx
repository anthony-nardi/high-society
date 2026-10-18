import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("tigris");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          ta="center"
          style={{ fontSize: "clamp(34px, 8vw, 72px)", letterSpacing: 3 }}
        >
          Tigris & Euphrates
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Kingdoms, conflicts and the lowest sphere. 2 to 4 players, by Reiner
          Knizia.
        </Text>
      </Center>
    </Stack>
  );
}
