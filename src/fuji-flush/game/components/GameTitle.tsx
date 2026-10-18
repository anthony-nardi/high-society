import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("fuji-flush");

  if (gameState) {
    return null;
  }

  return (
    <Stack h={200} justify="center" gap={4}>
      <Center>
        <Title
          order={1}
          style={{ fontSize: "clamp(40px, 10vw, 80px)", letterSpacing: 4 }}
        >
          Fuji Flush
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Push your cards through, flush everyone else's. 3 to 8 players, by
          Friedemann Friese.
        </Text>
      </Center>
    </Stack>
  );
}
