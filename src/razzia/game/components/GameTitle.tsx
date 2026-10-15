import { Center, Stack, Text, Title } from "@mantine/core";
import { useGameStateContext } from "../../../shared/context/GameStateProvider";

export default function GameTitle() {
  const { gameState } = useGameStateContext("razzia");

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
          Razzia!
        </Title>
      </Center>
      <Center>
        <Text c="dimmed">Bid for loot, dodge the police. 3 to 5 players.</Text>
      </Center>
    </Stack>
  );
}
