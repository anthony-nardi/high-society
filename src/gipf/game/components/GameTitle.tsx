import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("gipf");

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
          GIPF
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Push in, line up four, take them back. 2 players, the first game of
          the GIPF project by Kris Burm.
        </Text>
      </Center>
    </Stack>
  );
}
