import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("condottiere");

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
          Condottiere
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Hire mercenaries, win the cities of Italy. 2 to 6 players, by
          Dominique Ehrhard.
        </Text>
      </Center>
    </Stack>
  );
}
