import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("shangri-la");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          ta="center"
          style={{ fontSize: "clamp(30px, 7vw, 64px)", letterSpacing: 2 }}
        >
          The Bridges of Shangri-La
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Masters, students and crumbling bridges. 3 to 4 players, by Leo
          Colovini.
        </Text>
      </Center>
    </Stack>
  );
}
