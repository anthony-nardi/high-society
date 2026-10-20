import { useCallback, useMemo, useState } from "react";
import PlayersList from "./components/PlayersList";
import {
  Button,
  Center,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import { getMaxPlayers, getMinPlayers } from "./playerLimits";
import readyUp from "../../high-society/client/readyUp";
import addBot from "../../high-society/client/addBot";
import removeBot from "../../high-society/client/removeBot";
import createLobby, { GameName } from "../../high-society/client/createLobby";
import { useGameStateContext } from "../context/GameStateProvider";
import { useUserContext } from "../context/useUserContext";
import { useLobbyContext } from "../context/useLobbyContext";
import displayName from "../utils/displayName";
import { GAME_INFO } from "@games/shared/gameInfo";
import type { LobbyTheme } from "./theme";
import classes from "./lobby.module.css";

/** A game's theme dresses the lobby; without one it keeps the plain look. */
function Dressed({
  theme,
  children,
}: {
  theme?: LobbyTheme;
  children: React.ReactNode;
}) {
  if (!theme) return <>{children}</>;
  return (
    <div
      className={classes.themed}
      style={
        {
          "--lobby-accent": theme.accent,
          background: theme.background,
        } as React.CSSProperties
      }
      data-testid="themed-lobby"
    >
      {theme.banner}
      <Text
        size="sm"
        c="dimmed"
        ta="center"
        className={classes.flavour}
        mb="md"
      >
        {theme.flavour}
      </Text>
      {children}
    </div>
  );
}

export default function Lobby({
  gameName,
  theme,
}: {
  gameName: GameName;
  theme?: LobbyTheme;
}) {
  const { user } = useUserContext();
  const { lobbyId, isLoadingLobbyData, lobbyData, isJoiningLobby } =
    useLobbyContext();
  const { gameState } = useGameStateContext(gameName);
  const [isReadying, setIsReadying] = useState<null | boolean>(null);
  const [isCreatingLobby, setIsCreatingLobby] = useState<null | boolean>(null);
  const [isAddingBot, setIsAddingBot] = useState<null | boolean>(null);
  const [isStartingWithBots, setIsStartingWithBots] = useState(false);
  const [removingBot, setRemovingBot] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Acquire's stockholder mode, chosen before the lobby exists.
  const [mode, setMode] = useState<"TYCOON" | "CLASSIC">("TYCOON");
  const hasModes = gameName === "acquire";

  const players = useMemo(() => lobbyData?.players || [], [lobbyData]);

  const isCurrentUserReady = useMemo(() => {
    if (!user) return false;
    const currentUser = players.find((player) => player.email === user.email);
    return (currentUser && currentUser.ready) || false;
  }, [user, players]);

  const status = useMemo(() => {
    const missing = getMinPlayers(gameName) - players.length;
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
  }, [players, isCurrentUserReady, gameName]);

  const handleCreateLobby = useCallback(async () => {
    setIsCreatingLobby(true);

    const lobby = await createLobby(gameName, hasModes ? { mode } : {});
    window.location.hash = `#${lobby.data.lobbyUID}`;

    setIsCreatingLobby(false);
  }, [gameName, hasModes, mode]);

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
    [lobbyId],
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

  /** Ready up and fill the empty seats with bots in one go; the last bot starts the game. */
  const handleStartWithBots = useCallback(async () => {
    if (!user || !user.email || !lobbyId) {
      throw new Error("There is no current user or lobby.");
    }
    setIsStartingWithBots(true);
    try {
      if (!isCurrentUserReady) {
        await readyUp({ email: user.email, lobbyUID: lobbyId });
      }
      const missing = Math.max(0, getMinPlayers(gameName) - players.length);
      for (let i = 0; i < missing; i++) {
        await addBot({ lobbyUID: lobbyId });
      }
    } finally {
      setIsStartingWithBots(false);
    }
  }, [user, lobbyId, isCurrentUserReady, gameName, players.length]);

  if (!user) {
    return null;
  }

  if (!lobbyId) {
    return (
      <Container size="xs" px="md">
        <Dressed theme={theme}>
          <Stack gap="sm" align="center">
            {hasModes && (
              <Stack gap={4} align="center">
                <SegmentedControl
                  value={mode}
                  onChange={(v) => setMode(v as "TYCOON" | "CLASSIC")}
                  data={[
                    { value: "TYCOON", label: "Tycoon Mode" },
                    { value: "CLASSIC", label: "Classic Mode" },
                  ]}
                  aria-label="Stockholder bonus mode"
                />
                <Text size="xs" c="dimmed" ta="center" maw={360}>
                  {mode === "TYCOON"
                    ? "Bonuses go to the top three stockholders. The rulebook's pick for a first game."
                    : "Bonuses go to the top two stockholders, as in the original game."}{" "}
                  Two-player games always use Classic.
                </Text>
              </Stack>
            )}
            <Button
              loading={!!isCreatingLobby}
              onClick={handleCreateLobby}
              color={theme?.accent}
              autoContrast
            >
              Create lobby
            </Button>
          </Stack>
        </Dressed>
      </Container>
    );
  }

  if (gameState) {
    return null;
  }

  if (isJoiningLobby || isLoadingLobbyData || !!isCreatingLobby) {
    // Inside the same frame as the lobby, so the page does not jump when it arrives.
    return (
      <Container size="xs" px="md">
        <Dressed theme={theme}>
          <Center mih={120}>
            <Loader />
          </Center>
        </Dressed>
      </Container>
    );
  }

  if (!lobbyData || !players.length) {
    return <Center>Lobby does not exist.</Center>;
  }

  const isFull = players.length >= getMaxPlayers(gameName);
  const minPlayers = getMinPlayers(gameName);
  const maxPlayers = getMaxPlayers(gameName);
  const missingForBots = Math.max(0, minPlayers - players.length);
  // A game that seats more than two is not meant to be a duel: one bot is
  // added by hand, not by the shortcut.
  const offerBots =
    missingForBots > 0 && (missingForBots > 1 || maxPlayers === 2);
  const info = GAME_INFO[gameName];

  return (
    <Container size="xs" px="md">
      <Dressed theme={theme}>
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

          <Text size="xs" c="dimmed" ta="center">
            {info?.title ?? gameName} seats{" "}
            {minPlayers === maxPlayers
              ? minPlayers
              : `${minPlayers} to ${maxPlayers}`}{" "}
            players. Bots can take any empty seat.
            {hasModes &&
              (lobbyData.options?.mode === "CLASSIC"
                ? " Classic Mode: bonuses to the top two stockholders."
                : " Tycoon Mode: bonuses to the top three stockholders (Classic with two players).")}
          </Text>

          <PlayersList
            players={players}
            onRemoveBot={handleRemoveBot}
            removingBot={removingBot}
            seatIcons={theme?.seatIcons}
            botIcon={theme?.botIcon}
          />

          <Text size="sm" c="dimmed" ta="center" aria-live="polite">
            {status}
          </Text>

          {!isCurrentUserReady && (
            <Button
              size="lg"
              onClick={handleReadyUp}
              loading={!!isReadying}
              disabled={!!isReadying || isStartingWithBots}
            >
              I'm ready
            </Button>
          )}
          {offerBots && (
            <Button
              size="lg"
              variant="light"
              onClick={handleStartWithBots}
              loading={isStartingWithBots}
              disabled={isStartingWithBots || !!isReadying}
            >
              Start now with {missingForBots} bot
              {missingForBots === 1 ? "" : "s"}
            </Button>
          )}
        </Stack>
      </Dressed>
    </Container>
  );
}
