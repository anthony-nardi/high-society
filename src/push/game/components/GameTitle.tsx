import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("push");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(40px, 10vw, 80px)", letterSpacing: 6 }}
        >
          PUSH
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Turn cards over, stop before you bust, and keep your colours away from
          the die. 2 to 6 players, by Prospero Hall.
        </Text>
      </Center>
    </Stack>
  );
}
