import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("ride-the-rails");

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
          Ride the Rails
        </Title>
      </Center>
      <Center>
        <Text c="dimmed" ta="center" px="md">
          Shares, track and passengers across America. 3 to 5 players, by John
          Bohrer.
        </Text>
      </Center>
    </Stack>
  );
}
