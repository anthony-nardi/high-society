import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("savanna");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          ta="center"
          style={{ fontSize: "clamp(32px, 8vw, 72px)", letterSpacing: 3 }}
        >
          Ecosystem: Savanna
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Draft the Serengeti, four by five: grazers by the water, hunters on
          the prowl, scavengers waiting. 2 to 6 players.
        </Text>
      </Center>
    </Stack>
  );
}
