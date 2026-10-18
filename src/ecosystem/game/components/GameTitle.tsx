import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("ecosystem");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(36px, 9vw, 76px)", letterSpacing: 3 }}
        >
          Ecosystem
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Draft animals and landforms into a living grid of twenty. 2 to 6
          players, by Matt Simpson.
        </Text>
      </Center>
    </Stack>
  );
}
