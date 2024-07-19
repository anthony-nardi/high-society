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
  const [isLoading, setIsLoading] = useState(true);
  const lobbyJoined = useRef<number | null>(null);

  useEffect(() => {
    if (!lobbyId || lobbyJoined.current === lobbyId) return;
    setIsLoading(true);
    lobbyJoined.current = lobbyId;

    const auth = getAuth();

    auth.onAuthStateChanged((user) => {
      setTimeout(() => {
        console.log("user is logged in");
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
              setIsLoading(true);
            });
        } else {
          setIsLoading(false);
        }
      }, 5000);
    });
  }, [lobbyId, onAuthentication]);

  return {
    isLoading,
  };
};

export default useJoinLobby;
