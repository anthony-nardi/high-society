import admin from "firebase-admin";

import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { getDatabase } from "firebase-admin/database";
import {
  awardPlayerWithCurrentStatusCard,
  createGame,
  getActivePlayer,
  getDoesBiddingRoundEndOnFirstPass,
  getEmailFromRequest,
  getGameState,
  getPlayersActivelyBidding,
  giveCurrentStatusCardToPlayer,
  isActivePlayerTakingAction,
  isGameOver,
  maybeUseMinusCard,
  returnPlayersBidToHand,
  revealNewStatusCard,
  setActivePlayerPass,
  updateGameState,
  updateNextActivePlayer,
  updatePlayerLastAction,
  updatePlayersBid,
  verifyRequestAuthentication,
} from "./helpers";
import { Notification } from "./types";
// import { getVertexAI, getGenerativeModel } from "firebase/vertexai-preview";
import {
  FunctionDeclarationSchemaType,
  VertexAI,
} from "@google-cloud/vertexai";

const project = "high-society-c4ff4";
const location = "us-central1";
const textModel = "gemini-1.5-flash"; // "gemini-1.0-pro";
/*
https://ai.google.dev/api?lang=node
https://cloud.google.com/vertex-ai/generative-ai/docs/reference/nodejs/latest

*/
const vertexAI = new VertexAI({ project: project, location: location });

admin.initializeApp();
// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
});

const functionDeclarations = [
  {
    functionDeclarations: [
      {
        name: "get_bot_action",
        description:
          "gets the best action during this players turn to maximize victory",
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            action: { type: FunctionDeclarationSchemaType.STRING },
            actionType: {
              type: FunctionDeclarationSchemaType.STRING,
              enum: ["pass", "bid"],
            },
          },
        },
      },
    ],
  },
];

const functionResponseParts = [
  {
    functionResponse: {
      name: "get_bot_action",
      response: {
        name: "get_bot_action",
        content: { action: "super nice" },
      },
    },
  },
];

async function generateContent() {
  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Only give me a javascript array with values 1, 2, 25.",
          },
        ],
      },
    ],
  };
  const result = await generativeModel.generateContent(request);
  const response = result.response;

  if (response.candidates) {
    const text = JSON.stringify(response.candidates[0].content.parts[0].text);
    // console.log(text);
    // Regex to match an array enclosed in square brackets
    const regex = /\[(.*?)\]/;

    // Find the first match
    const match = text.match(regex);

    // If there is a match, extract the array content
    let array;
    if (match) {
      // Remove the square brackets and split by commas
      array = match[1].trim().split(",");

      // Parse each element as a number
      array = array.map(Number);
    } else {
      console.log("No array found in the string.");
    }

    console.log(array); // Output: [1, 2, 3]
  } else {
    console.log("NO CONTENT!");
  }
}

// eslint-disable-next-line
// @typescript-eslint/no-unused-vars
async function getBotAction() {
  const chat = generativeModel.startChat({
    tools: functionDeclarations,
  });
  const chatInput1 = "What is the best action to take?";
  // This should include a functionCall response from the model
  const streamingResult1 = await chat.sendMessageStream(chatInput1);
  for await (const item of streamingResult1.stream) {
    if (item.candidates) {
      console.log(item.candidates[0]);
    }
  }
  const response1 = await streamingResult1.response;
  console.log("first aggregated response: ", JSON.stringify(response1));

  // Send a follow up message with a FunctionResponse
  const streamingResult2 = await chat.sendMessageStream(functionResponseParts);
  for await (const item of streamingResult2.stream) {
    if (item.candidates) {
      console.log(item.candidates[0]);
    }
  }
  // This should include a text response from the model using the response content
  // provided above
  const response2 = await streamingResult2.response;
  console.log("second aggregated response: ", JSON.stringify(response2));
}
console.log(getBotAction);

exports.bid = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      bid: string[];
    }>
  ) => {
    verifyRequestAuthentication(request);

    const { lobbyUID, bid } = request.data;
    const requestEmail = getEmailFromRequest(request);
    const gameState = await getGameState(lobbyUID);

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const activePlayer = getActivePlayer(gameState);

    updatePlayerLastAction(activePlayer);
    updatePlayersBid(activePlayer, bid);
    updateNextActivePlayer(gameState);

    const totalBid = bid.reduce(
      (sum: number, current) => Number(sum) + Number(current),
      0
    );

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${requestEmail} has highest bid of ${totalBid}.`,
    };

    gameState.public.notification = notification;

    return updateGameState(
      gameState,
      `Player ${requestEmail} bid ${bid.join(",")}`
    );
  }
);

exports.passturn = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
    }>
  ) => {
    verifyRequestAuthentication(request);

    const requestEmail = getEmailFromRequest(request);
    const { lobbyUID } = request.data;

    const gameState = await getGameState(lobbyUID);
    const players = gameState.public.players;

    if (!isActivePlayerTakingAction(gameState, requestEmail)) {
      return;
    }

    const doesBiddingRoundEndOnFirstPass =
      getDoesBiddingRoundEndOnFirstPass(gameState);

    if (doesBiddingRoundEndOnFirstPass) {
      // The active player is the one who passed.

      // Award the player who passed the currentStatusCard
      // The player who passed current bid is returned to their moneyCards
      // Reset all players current bids
      // Flip a new card from the deck

      const cardAwarded = gameState.public.currentStatusCard;

      players.forEach((player) => {
        if (player.email === requestEmail) {
          updatePlayerLastAction(player);
          giveCurrentStatusCardToPlayer(player, gameState);
          returnPlayersBidToHand(player);
          maybeUseMinusCard(player, gameState);
        } else {
          player.currentBid = [];
        }
      });

      revealNewStatusCard(gameState);

      let message = "";

      if (isGameOver(gameState)) {
        gameState.public.status = "GAME_OVER";
        const { currentStatusCard } = gameState.public;
        message = `${currentStatusCard} was revealed. Game over.`;
      }

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${requestEmail} passes and receives ${cardAwarded}.`,
        message,
      };

      gameState.public.notification = notification;

      return updateGameState(
        gameState,
        `${requestEmail} is the first to pass and receives ${cardAwarded}.`
      );
    }

    const activePlayer = getActivePlayer(gameState);

    updatePlayerLastAction(activePlayer);
    setActivePlayerPass(gameState);
    returnPlayersBidToHand(activePlayer);

    const playersWithActiveBids = getPlayersActivelyBidding(gameState);

    if (playersWithActiveBids === 1) {
      // Award the player with the only remaining bid the currentStatusCard
      // All players who passed return their currentBid to their moneyCard
      // Set all players hasPassed flags to false
      // Flip a new card from the deck

      let auctionWinner = "";
      let totalBid = 0;
      const cardAwarded = gameState.public.currentStatusCard;

      players.forEach((player) => {
        if (player.hasPassed === false) {
          totalBid = (player.currentBid || []).reduce(
            (sum: number, current: string) => Number(sum) + Number(current),
            0
          );

          awardPlayerWithCurrentStatusCard(player, gameState);
          auctionWinner = player.email;
        }

        player.hasPassed = false;
      });

      revealNewStatusCard(gameState);

      let message = "";

      if (isGameOver(gameState)) {
        gameState.public.status = "GAME_OVER";
        const { currentStatusCard } = gameState.public;
        message = `${currentStatusCard} was revealed. Game over.`;
      }

      gameState.public.activePlayer = auctionWinner;

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${auctionWinner} won ${cardAwarded} for a total of ${totalBid}.`,
        message,
      };

      gameState.public.notification = notification;

      return updateGameState(gameState, `Player ${auctionWinner} won auction.`);
    } else {
      // Update the next player
      // Player who passed has their bid returned to their hand
      updateNextActivePlayer(gameState);

      const notification: Notification = {
        timestamp: Date.now(),
        title: `${requestEmail} passed.`,
      };

      gameState.public.notification = notification;

      return updateGameState(gameState, `${requestEmail} has passed.`);
    }
  }
);

exports.createlobby = onCall(async (request) => {
  verifyRequestAuthentication(request);

  const lobbyUID = Date.now().toString();

  console.log("generateContent...");
  await generateContent();

  return getDatabase()
    .ref("/lobbies/" + lobbyUID)
    .set({
      id: lobbyUID,
      game: "high-society",
      players: [
        {
          email: request?.auth?.token.email || request?.auth?.token.uid,
          ready: false,
          joinedAt: Date.now().toString(),
        },
      ],
    })
    .then(() => {
      logger.info("New lobby created.");
      return { lobbyUID };
    })
    .catch((error: Error) => {
      // Re-throwing the error as an HttpsError so that the client gets
      // the error details.
      throw new HttpsError("unknown", error.message, error);
    });
});

exports.joinlobby = onCall(
  async (
    request: CallableRequest<{
      lobbyUID: string;
      email: string;
    }>
  ) => {
    // Checking that the user is authenticated.
    if (!request.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new HttpsError(
        "failed-precondition",
        "The function must be " + "called while authenticated."
      );
    }

    const { lobbyUID, email } = request.data;

    // Add new player to the lobby if they don't already exist

    const players = await getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .get();

    const playersSnapshotValue = players.val();

    console.log(playersSnapshotValue);

    if (playersSnapshotValue.length >= 5) {
      return;
    }

    const gameState = await getGameState(lobbyUID);

    if (gameState) {
      return;
    }

    const doesPlayerExist = playersSnapshotValue.find(
      (player: any) => player.email === email
    );

    console.log("doesPlayerExist:", doesPlayerExist ? "true" : "false");

    if (doesPlayerExist) return;

    console.log(`Attempting to add ${email} to the lobby.`);

    playersSnapshotValue.push({
      email,
      ready: false,
      joinedAt: Date.now().toString(),
    });

    console.log(`New players: ${playersSnapshotValue}`);

    getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .set(playersSnapshotValue)
      .then(() => {
        logger.info("Lobby joined.");
        return { lobbyUID };
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }
);

exports.readyup = onCall(
  async (
    request: CallableRequest<{
      email: string;
      lobbyUID: string;
    }>
  ) => {
    // Checking that the user is authenticated.
    if (!request.auth) {
      // Throwing an HttpsError so that the client gets the error details.
      throw new HttpsError(
        "failed-precondition",
        "The function must be " + "called while authenticated."
      );
    }

    const { lobbyUID, email } = request.data;

    // Add new player to the lobby if they don't already exist

    const players = await getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .get();

    const playersSnapshotValue = players.val();

    let areAllPlayersReady = true;

    playersSnapshotValue.forEach((player: any) => {
      if (player.email === email) {
        player.ready = true;
      }

      if (player.ready === false) {
        areAllPlayersReady = false;
      }
    });

    if (playersSnapshotValue.length >= 3 && areAllPlayersReady) {
      try {
        await createGame(lobbyUID);
      } catch (e) {
        console.log(e);
      }
    }

    getDatabase()
      .ref(`lobbies/${lobbyUID}/players`)
      .set(playersSnapshotValue)
      .then(() => {
        logger.info("Lobby joined.");
        return { lobbyUID };
      })
      .catch((error: Error) => {
        // Re-throwing the error as an HttpsError so that the client gets
        // the error details.
        throw new HttpsError("unknown", error.message, error);
      });
  }
);
