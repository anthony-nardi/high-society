import { useContext } from "react";
import { UserContext } from "./UserProvider";

export const useUserContext = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUserContext must be used within a UserContext");
  }

  return context;
};
