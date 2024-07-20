import { useCallback, useEffect, useMemo, useState } from "react";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import { User } from "firebase/auth";
import { CreateLobbyResponse, LobbyData } from "./types";
import PlayersList from "./components/PlayersList";
import { Button, Center, Flex, Grid, Loader } from "@mantine/core";
import ConnectedPlayersCount from "./components/ConnectedPlayersCount";
import useJoinLobby from "./hooks/useJoinLobby";

export default function Lobby({ user }: { user: User | null }) {
  const [lobbyId, setLobbyId] = useState<number | null>(
    Number(window.location.hash.replace(/\D/g, ""))
  );
  const [lobbyData, setLobbyData] = useState<null | LobbyData>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [isFetchingLobbyData, setIsFetchingLobbyData] = useState<
    null | boolean
  >(null);
  const [isReadying, setIsReadying] = useState<null | boolean>(null);

  const isCurrentUserReady = useMemo(() => {
    if (!currentUser || !lobbyData) return false;

    if ("players" in lobbyData) {
      const user = lobbyData.players.find(
        (player) => player.email === currentUser.email
      );

      return (user && user.ready) || false;
    }
  }, [currentUser, lobbyData]);

  const { isLoading: isLoadingLobbyJoin } = useJoinLobby({
    lobbyId,
    onAuthentication: setCurrentUser,
  });

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  useEffect(() => {
    if (!lobbyId || typeof lobbyId !== "number") return;
    setIsFetchingLobbyData(true);
    const db = getDatabase();

    const lobbyRef = ref(db, "lobbies/" + lobbyId);

    onValue(lobbyRef, (snapshot) => {
      const data = snapshot.val();
      setLobbyData(data);
      setIsFetchingLobbyData(false);
    });
  }, [lobbyId]);

  useEffect(() => {
    window.addEventListener("popstate", handleURLChange);

    return () => {
      window.removeEventListener("popstate", handleURLChange);
    };
  }, [handleURLChange]);

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

  if (isLoadingLobbyJoin || isFetchingLobbyData) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  if (!lobbyData || !lobbyData.players.length) {
    return <div>No data found for lobby</div>;
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
                  <Button onClick={handleReadyUp} loading={!!isReadying}>
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
