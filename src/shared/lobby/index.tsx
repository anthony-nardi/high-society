import { useCallback, useMemo, useState } from "react";
import PlayersList from "./components/PlayersList";
import {
  Button,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import { getMaxPlayers, MIN_PLAYERS } from "./playerLimits";
import readyUp from "../../high-society/client/readyUp";
import addBot from "../../high-society/client/addBot";
import removeBot from "../../high-society/client/removeBot";
import createLobby, { GameName } from "../../high-society/client/createLobby";
import { useGameStateContext } from "../context/GameStateProvider";
import { useUserContext } from "../context/useUserContext";
import { useLobbyContext } from "../context/useLobbyContext";
import displayName from "../utils/displayName";

export default function Lobby({ gameName }: { gameName: GameName }) {
  const { user } = useUserContext();
  const { lobbyId, isLoadingLobbyData, lobbyData, isJoiningLobby } =
    useLobbyContext();
  const { gameState } = useGameStateContext(gameName);
  const [isReadying, setIsReadying] = useState<null | boolean>(null);
  const [isCreatingLobby, setIsCreatingLobby] = useState<null | boolean>(null);
  const [isAddingBot, setIsAddingBot] = useState<null | boolean>(null);
  const [removingBot, setRemovingBot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const players = useMemo(() => lobbyData?.players || [], [lobbyData]);

  const isCurrentUserReady = useMemo(() => {
    if (!user) return false;
    const currentUser = players.find((player) => player.email === user.email);
    return (currentUser && currentUser.ready) || false;
  }, [user, players]);

  const status = useMemo(() => {
    const missing = MIN_PLAYERS - players.length;
    if (missing > 0) {
      return `Waiting for ${missing} more player${missing === 1 ? "" : "s"}. Share the invite link or add a bot.`;
    }
    const notReady = players.filter((player) => !player.ready);
    if (notReady.length === 0) {
      return "Everyone is ready. Starting…";
    }
    if (!isCurrentUserReady) {
      return "Press Ready when you are set. The game starts as soon as everyone is ready.";
    }
    return `Waiting for ${notReady.map((p) => displayName(p.email)).join(", ")} to ready up.`;
  }, [players, isCurrentUserReady]);

  const handleCreateLobby = useCallback(async () => {
    setIsCreatingLobby(true);

    const lobby = await createLobby(gameName);
    window.location.hash = `#${lobby.data.lobbyUID}`;

    setIsCreatingLobby(false);
  }, [gameName]);

  const handleCopyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.log(e);
      notifications.show({
        title: "Could not copy",
        message: window.location.href,
        color: "yellow",
      });
    }
  }, []);

  const handleAddBot = useCallback(async () => {
    if (!user || !user.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }

    setIsAddingBot(true);

    await addBot({
      lobbyUID: lobbyId,
    });

    setIsAddingBot(false);
  }, [user, lobbyId]);

  const handleRemoveBot = useCallback(
    async (email: string) => {
      if (!lobbyId) return;
      setRemovingBot(email);
      try {
        await removeBot({ lobbyUID: lobbyId, email });
      } finally {
        setRemovingBot(null);
      }
    },
    [lobbyId]
  );

  const handleReadyUp = useCallback(async () => {
    if (!user || !user.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }

    setIsReadying(true);

    await readyUp({
      email: user.email,
      lobbyUID: lobbyId,
    });

    setIsReadying(false);
  }, [user, lobbyId]);

  if (!user) {
    return null;
  }

  if (!lobbyId) {
    return (
      <Center>
        <Button loading={!!isCreatingLobby} onClick={handleCreateLobby}>
          Create lobby
        </Button>
      </Center>
    );
  }

  if (gameState) {
    return null;
  }

  if (isJoiningLobby || isLoadingLobbyData || !!isCreatingLobby) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (!lobbyData || !players.length) {
    return <Center>Lobby does not exist.</Center>;
  }

  const isFull = players.length >= getMaxPlayers(gameName);

  return (
    <Container size="xs" px="md">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <ConnectedPlayersCount gameName={gameName} players={players} />
          <Group gap="xs">
            <Button variant="default" onClick={handleCopyInvite}>
              {copied ? "Link copied" : "Copy invite link"}
            </Button>
            <Button
              variant="default"
              onClick={handleAddBot}
              loading={!!isAddingBot}
              disabled={!!isAddingBot || isFull}
              title={isFull ? "The lobby is full" : undefined}
            >
              Add bot
            </Button>
          </Group>
        </Group>

        <PlayersList
          players={players}
          onRemoveBot={handleRemoveBot}
          removingBot={removingBot}
        />

        <Text size="sm" c="dimmed" ta="center" aria-live="polite">
          {status}
        </Text>

        {!isCurrentUserReady && (
          <Button
            size="lg"
            onClick={handleReadyUp}
            loading={!!isReadying}
            disabled={!!isReadying}
          >
            I'm ready
          </Button>
        )}
      </Stack>
    </Container>
  );
}
