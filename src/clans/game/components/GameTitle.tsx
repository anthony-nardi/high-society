import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("clans");

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
          Clans
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Herd the huts into villages, but keep your clan a secret. 2 to 4
          players, by Leo Colovini.
        </Text>
      </Center>
    </Stack>
  );
}
