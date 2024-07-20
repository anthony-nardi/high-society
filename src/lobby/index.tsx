import { useCallback, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { User } from "firebase/auth";
import { CreateLobbyResponse } from "./types";
import PlayersList from "./components/PlayersList";
import { Button, Center, Flex, Grid, Loader } from "@mantine/core";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import useJoinLobby from "./hooks/useJoinLobby";
import useLobbyData from "./hooks/useLobbyData";
import usePopstate from "../hooks/usePopstate";

export default function Lobby({ user }: { user: User | null }) {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  const [isReadying, setIsReadying] = useState<null | boolean>(null);

  const { isLoading: isLoadingLobbyJoin } = useJoinLobby({
    lobbyId,
    onAuthentication: setCurrentUser,
  });

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  const { isLoading: isLoadingLobbyData, lobbyData } = useLobbyData(lobbyId);

  const isCurrentUserReady = useMemo(() => {
    if (!currentUser || !lobbyData) return false;

    if ("players" in lobbyData) {
      const user = lobbyData.players.find(
        (player) => player.email === currentUser.email
      );

      return (user && user.ready) || false;
    }
  }, [currentUser, lobbyData]);

  usePopstate(handleURLChange);

  const handleCreateLobby = useCallback(() => {
    const functions = getFunctions();

    const createLobby = httpsCallable<undefined, CreateLobbyResponse>(
      functions,
      "createlobby"
    );
    createLobby().then((result) => {
      const data = result.data;

      if (data.lobbyUID) {
        window.location.hash = `#${data.lobbyUID}`;
      }
    });
  }, []);

  const handleReadyUp = useCallback(async () => {
    if (!currentUser) {
      throw new Error("There is no current user.");
    }
    setIsReadying(true);
    const functions = getFunctions();

    const readyUp = httpsCallable<{ email: string; lobbyUID: number }, void>(
      functions,
      "readyup"
    );

    if (!currentUser.email || !lobbyId) {
      throw new Error("email or lobbyId does not exist");
    }

    await readyUp({
      email: currentUser.email,
      lobbyUID: lobbyId,
    });
    setIsReadying(false);
  }, [currentUser, lobbyId]);

  if (!lobbyId) {
    return (
      <Center>
        <Button onClick={handleCreateLobby}>Create lobby</Button>
      </Center>
    );
  }

  if (isLoadingLobbyJoin || isLoadingLobbyData) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (!lobbyData || !lobbyData.players.length) {
    return <Center>Lobby does not exist.</Center>;
  }

  return (
    <>
      <Grid>
        <Grid.Col span={{ base: 6, md: 6, lg: 6 }} offset={3}>
          <Center>
            <Flex direction={"column"}>
              <Flex
                justify={"space-between"}
                align={"end"}
                styles={{ root: { marginBottom: "16px" } }}
              >
                <ConnectedPlayersCount
                  players={(lobbyData && lobbyData.players) || []}
                />
                {!isCurrentUserReady && (
                  <Button
                    onClick={handleReadyUp}
                    loading={!!isReadying}
                    disabled={!!isReadying}
                  >
                    Click here to ready!
                  </Button>
                )}
              </Flex>
              <PlayersList players={lobbyData.players} />
            </Flex>
          </Center>
        </Grid.Col>
      </Grid>
    </>
  );
}
