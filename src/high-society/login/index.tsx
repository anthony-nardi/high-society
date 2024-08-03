import { useCallback } from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { GoogleIcon } from "./GoogleIcon";
import { Button, Center, Loader, Stack } from "@mantine/core";
import { useUserContext } from "../context/useUserContext";

export default function Login() {
  const { isSignedIn, handleSignInSuccess, handleSignInFailed } =
    useUserContext();

  const handleSignIn = useCallback(() => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
          handleSignInFailed();
          throw new Error("Credential not found.");
        }

        handleSignInSuccess(result.user);
      })
      .catch((error: Error) => {
        handleSignInFailed();
        console.log(error);
      });
  }, [handleSignInFailed, handleSignInSuccess]);

  // isSignedIn will automatically be set to false or true without
  // user interaction due to the auth.onAuthStateChanged found
  // inside the LobbyProvider
  if (isSignedIn === null) {
    return (
      <Stack h={200} align="stretch" justify="space-around" gap="md">
        <Center>
          <Loader />
        </Center>
      </Stack>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <Stack h={200} align="stretch" justify="space-around" gap="md">
      <Center>
        <Button
          onClick={handleSignIn}
          leftSection={<GoogleIcon />}
          variant="default"
        >
          Continue with Google
        </Button>
      </Center>
    </Stack>
  );
}
