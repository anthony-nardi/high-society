import { getAuth, User } from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  HttpsCallableResult,
} from "firebase/functions";
import { useEffect, useRef, useState } from "react";

const useJoinLobby = ({
  lobbyId,
  onAuthentication,
}: {
  lobbyId: number | null;
  onAuthentication: (user: User) => void;
}) => {
  const [isLoading, setIsLoading] = useState<null | boolean>(true);
  const lobbyJoined = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || lobbyJoined.current === lobbyId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    lobbyJoined.current = lobbyId;

    const auth = getAuth();

    auth.onAuthStateChanged((user) => {
      if (user && typeof user.email === "string") {
        onAuthentication(user);
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
      } else {
        setIsLoading(false);
      }
    });
  }, [lobbyId, onAuthentication]);

  return {
    isLoading,
  };
};

export default useJoinLobby;
