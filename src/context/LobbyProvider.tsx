import { getAuth, User } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import getLobbyIdFromURL from "../utils/getLobbyIdFromURL";
import usePopstate from "../hooks/usePopstate";

const LobbyContext = createContext<{
  lobbyId: null | number;
  isSignedIn: null | boolean;
  user: User | null;
  handleSignInFailed: () => void;
  handleSignInSuccess: (user: User) => void;
}>({
  lobbyId: null,
  isSignedIn: null,
  user: null,
  handleSignInFailed: () => {},
  handleSignInSuccess: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useLobbyContext = () => {
  const context = useContext(LobbyContext);

  if (!context) {
    throw new Error("useLobbyContext must be used within a LobbyContext");
  }

  return context;
};

export const LobbyProvider = ({ children }: { children: React.ReactNode }) => {
  const [lobbyId, setLobbyId] = useState<number | null>(getLobbyIdFromURL());
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const handleURLChange = useCallback(() => {
    const lobbyUID = window.location.hash.replace(/\D/g, "");
    setLobbyId(Number(lobbyUID));
  }, []);

  usePopstate(handleURLChange);

  const handleSignInFailed = useCallback(() => {
    setIsSignedIn(false);
  }, []);

  const handleSignInSuccess = useCallback((user: User) => {
    setIsSignedIn(true);
    setUser(user);

    if (!user.email) {
      throw new Error("User doesn't have an email");
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      if (user) {
        handleSignInSuccess(user);
      } else {
        handleSignInFailed();
      }
    });
  }, [handleSignInSuccess, handleSignInFailed]);

  return (
    <LobbyContext.Provider
      value={{
        lobbyId,
        isSignedIn,
        user,
        handleSignInSuccess,
        handleSignInFailed,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
};
