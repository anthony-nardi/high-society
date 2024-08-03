import { User } from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from "firebase/functions";
import { useEffect, useRef, useState } from "react";

const useJoinLobby = ({
  lobbyId,
  user,
}: {
  lobbyId: number | null;
  user: User | null;
}) => {
  const [isLoading, setIsLoading] = useState<null | boolean>(true);
  const lobbyJoined = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !user.email || !lobbyId || lobbyJoined.current === lobbyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    lobbyJoined.current = lobbyId;
    const functions = getFunctions();
    const joinLobby = httpsCallable<
      { email: string; lobbyUID: number },
      HttpsCallableResult<object>
    >(functions, "joinlobby");

    joinLobby({
      email: user.email,
      lobbyUID: lobbyId,
    })
      .catch((err) => {
        console.log(err);
        lobbyJoined.current = null;
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [lobbyId, user]);

  return {
    isLoading,
  };
};

export default useJoinLobby;
