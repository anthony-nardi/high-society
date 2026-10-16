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
        <Text c="dimmed" ta="center" px="md">
          Night falls and the gangsters gather to divide up the city, but time
          is against them. At dawn, the police will impose justice. 3 to 5
          players.
        </Text>
      </Center>
    </Stack>
  );
}
