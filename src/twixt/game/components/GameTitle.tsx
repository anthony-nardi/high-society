import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("twixt");

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
          TwixT
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Peg a chain of knight's moves from your side to the other before they
          do. 2 players, by Alex Randolph.
        </Text>
      </Center>
    </Stack>
  );
}
