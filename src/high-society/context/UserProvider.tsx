import { getAuth, User } from "firebase/auth";
import { createContext, useCallback, useEffect, useState } from "react";

export const UserContext = createContext<{
  isSignedIn: null | boolean;
  user: User | null;
  handleSignInFailed: () => void;
  handleSignInSuccess: (user: User) => void;
  setUser: (user: User) => void;
}>({
  isSignedIn: null,
  user: null,
  handleSignInFailed: () => {},
  handleSignInSuccess: () => {},
  setUser: () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);

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
    <UserContext.Provider
      value={{
        isSignedIn,
        user,
        setUser,
        handleSignInFailed,
        handleSignInSuccess,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
