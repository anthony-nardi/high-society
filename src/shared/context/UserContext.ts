import type { User } from "firebase/auth";
import { createContext } from "react";

export type UserContextValue = {
  isSignedIn: null | boolean;
  user: User | null;
  handleSignInFailed: () => void;
  handleSignInSuccess: (user: User) => void;
  setUser: (user: User) => void;
};

export const UserContext = createContext<UserContextValue>({
  isSignedIn: null,
  user: null,
  handleSignInFailed: () => {},
  handleSignInSuccess: () => {},
  setUser: () => {},
});
