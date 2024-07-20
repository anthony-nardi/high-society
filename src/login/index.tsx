import { useCallback, useEffect } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from "firebase/auth";
import { GoogleIcon } from "./GoogleIcon";
import { Button, Center, Loader, Stack } from "@mantine/core";

export default function Login({
  onSignInSuccess,
  onSignInFailed,
  isLoading,
}: {
  onSignInSuccess: (user: User) => void;
  onSignInFailed: () => void;
  isLoading: boolean;
}) {
  useEffect(() => {
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      if (user) {
        onSignInSuccess(user);
      } else {
        onSignInFailed();
      }
    });
  }, [onSignInSuccess, onSignInFailed]);

  const handleSignIn = useCallback(() => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);

        if (!credential) {
          onSignInFailed();
          throw new Error("Credential not found.");
        }

        onSignInSuccess(result.user);
      })
      .catch((error: Error) => {
        onSignInFailed();
        console.log(error);
      });
  }, [onSignInFailed, onSignInSuccess]);

  if (isLoading) {
    return (
      <Stack h={200} align="stretch" justify="space-around" gap="md">
        <Center>
          <Loader />
        </Center>
      </Stack>
    );
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
