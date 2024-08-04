import { Center, Stack } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("no-thanks");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="space-around" gap="md">
      <Center>
        <h1>No Thanks!</h1>
      </Center>
    </Stack>
  );
}
