import { VertexAI } from "@google-cloud/vertexai";
import { GameState, Notification } from "../types";
import {
  awardPlayerWithCurrentStatusCard,
  getActivePlayer,
  getBidValue,
  getDoesBiddingRoundEndOnFirstPass,
  getHighestCurrentBid,
  getPlayersActivelyBidding,
  giveCurrentStatusCardToPlayer,
  isGameOver,
  maybeUseMinusCard,
  returnPlayersBidToHand,
  revealNewStatusCard,
  setActivePlayerPass,
  updateGameState,
  updateNextActivePlayer,
  updatePlayerLastAction,
  updatePlayersBid,
  wait,
} from ".";

const project = "high-society-c4ff4";
const location = "us-central1";
const textModel = "gemini-1.5-flash"; // "gemini-1.0-pro";
/*
  https://ai.google.dev/api?lang=node
  https://cloud.google.com/vertex-ai/generative-ai/docs/reference/nodejs/latest
  
  */

const GAME_RULES_AND_STRATEGIES_PROMPT = `
## The Card Game:

**Goal:** Maximize your score at the end of the game. The player with the lowest sum of money cards at the end of the game is eliminated.

**Setup:**

* **Deck:**  The deck contains 16 cards:
    * 10 Luxury Cards: Values 1 through 10
    * 3 Recognition Cards: 2x (Doubles your score)
    * 3 Misfortune Cards: - (Thief), 1/2 (Mansion Fire), -5 (Scandal) 
* **Money:** Each player starts with 11 money cards: 1, 2, 3, 4, 6, 8, 10, 12, 15, 20, 25

**Gameplay:**

1. **Bidding:** Players take turns bidding on cards, using their money cards. **Players can use multiple money cards in a single turn to increase their bid.**  The highest bidder wins the card. 
2. **Winning a Card:**  The winning player removes their bid from the game and adds the card to their hand.
3. **Misfortune Cards:**  When a Misfortune card is revealed, the first player to pass always takes the card but keeps their bid. All other players who have bid lose their bid. It's really important to avoid taking a misfortune card unless you can afford the loss of your bid.
4. **Game End:** The game ends when the 4th red-edged card (2x Recognition, Mansion Fire) is revealed. Any remaining cards are not used.

**Scoring:**

1. **Base Score:** Sum the values of all your Luxury cards.
2. **Thief Penalty:**  Subtract 5 points if you hold the "-" (Thief) card.
3. **Recognition Bonus:** Multiply your score by 2 for each "2x" (Recognition) card you hold. 
4. **Mansion Fire Penalty:** Halve your score if you hold the "1/2" (Mansion Fire) card.

**Winning:** The player with the highest final score wins.

**Strategies:**

* **Luxury Card Value:** Consider using larger denominations for high-value Luxury cards, aiming for the most efficient use of your money. 
* **Recognition Card Priority:** Prioritize acquiring at least one Recognition card (2x) for a significant score boost.
* **Misfortune Card Management:**  Avoid taking Misfortune cards if possible, especially the "Scandal" (-5).
* **Money Management:**  Preserve smaller denominations for flexibility and future bids, but don't be afraid to use larger denominations when necessary for strategic advantage.
* **Adaptability:** Analyze the bidding patterns of other players and adjust your strategy accordingly.
* **Typical value of 10:** The typical value for 10 is a 25 money card. This is to help anchor your decisions.
`;

const vertexAI = new VertexAI({ project: project, location: location });

// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
});

function buildGameStatePrompt(gameState: GameState) {
  const activePlayer = getActivePlayer(gameState);
  const currentAuctionedCard = gameState.public.currentStatusCard;
  const currentHighBid = getHighestCurrentBid(gameState);
  const activePlayersRemainingMoney = activePlayer.moneyCards;
  const activePlayersCurrentWonCards = activePlayer.statusCards || [];
  const activePlayersCurrentBid = getBidValue(activePlayer.currentBid || []);

  const isMisfortuneCard = ["-", "1/2", "-5"].includes(currentAuctionedCard);

  let prompt = GAME_RULES_AND_STRATEGIES_PROMPT;

  prompt += `Make the optimal move given the following game state.\n`;
  prompt += `Total players: ${gameState.public.players.length}`;

  prompt += `You have 2 options. Bid or pass.\n`;
  prompt += `If bidding, only return an array of money cards to add to your current bid of ${activePlayersCurrentBid}. Your total bit must be higher than ${currentHighBid}\n`;
  prompt += `If passing, only return an array of the word "Pass"\n`;
  //   prompt += `Include a very brief explanation of your decision.\n`;

  prompt += `Your response absolutely must be in the following format: "[money_card_1, money_card_2, ...]" or "['pass']"`;

  let gameStatePromptAddition = "";

  gameStatePromptAddition += `Current card for auction: ${currentAuctionedCard}\n`;
  gameStatePromptAddition += `Current highest bid: ${currentHighBid}.\n`;
  gameStatePromptAddition += `Your remaining money: ${JSON.stringify(
    activePlayersRemainingMoney
  )}.\n`;
  gameStatePromptAddition += `Never spend all your money cards.\n`;
  if (activePlayersCurrentWonCards.length) {
    gameStatePromptAddition += `Your current held status cards: ${JSON.stringify(
      activePlayersCurrentWonCards
    )}.\n`;
  } else {
    gameStatePromptAddition += `You do not have any status cards.\n`;
  }

  if (isMisfortuneCard) {
    gameStatePromptAddition += `The current card for auction is a Misfortune Card. It is wise to bid to avoid taking the card because the first player to pass will receive it. Only pass if you can afford losing your bid. Consider that if other plays have bid they will lose their bid if you pass. So that means if a player hasn't yet placed a bid and you pass, they didn't lose anything. Don't overbid to avoid taking the card.`;
  }

  const entirePrompt = prompt + gameStatePromptAddition;

  console.log(
    "Start Prompt:",
    "\n",
    "\n",
    entirePrompt,
    "\n",
    "\n",
    "End Prompt",
    "\n",
    "\n"
  );
  return entirePrompt;
}

function extractBidFromResponse(str: string) {
  const pattern = /\\"(\d+)\\"/g;
  const matches = [];
  let match;

  while ((match = pattern.exec(str)) !== null) {
    matches.push(match[1]);
  }

  return matches;
}

function extractBidFromResponse2(str: string) {
  // Pattern to match only the numbers within the square brackets
  const pattern = /\[\"(\d+)\",\s*\"(\d+)\"\]/;

  const match = str.match(pattern);
  let numbers;
  if (match) {
    console.log(match);
    // Extract the numbers from the capturing groups
    numbers = match.slice(1); // Skip the full match
  }
  return numbers;
}

function extractBidFromResponse3(str: string) {
  const pattern = /\[(\"(?:\d+\"(?:,\s*\")?)*)\]/;
  let numbers;
  const match = str.match(pattern);

  if (match) {
    console.log(match);
    // Extract the numbers from the capturing group
    const numbersString = match[1]; // Get the matched group
    numbers = numbersString.split('","').map((s) => s.replace(/"/g, ""));
  }

  return numbers;
}

function extractBidFromResponse4(str: string) {
  // Pattern to match the content inside square brackets, including single and multiple elements
  const pattern = /\["(\d+)"(?:,\s*"(\d+)")*\]/;

  const match = str.match(pattern);

  if (match) {
    console.log(match);
    // Extract the numbers from the capturing groups
    const numbers = match[0].match(/\d+/g);
    return numbers;
  }

  return undefined;
}

function extractPassFromResponse(str: string) {
  const regex = /\[\"(Pass)\"\]/g; // Matches "Pass" within double quotes inside square brackets
  const matches = str.match(regex);

  if (matches) {
    const parsedArray = matches.map((match) => match.slice(2, -2)); // Extracts "Pass" from the match
    return parsedArray;
  } else {
    console.log("No match found");
  }

  return undefined;
}

export async function generateContent(gameState: GameState) {
  const prompt = buildGameStatePrompt(gameState);

  const request = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };
  const result = await generativeModel.generateContent(request);
  const response = result.response;

  if (response.candidates) {
    const text = JSON.stringify(response.candidates[0].content.parts[0].text);

    console.log("Response:", "\n", "\n", text, "\n", "\n");

    const attempt4Parse = extractBidFromResponse4(text);
    const attempt3Parse = extractBidFromResponse3(text);
    const attempt2Parse = extractBidFromResponse2(text);
    const attempt1Parse = extractBidFromResponse(text);

    const didPass = extractPassFromResponse(text);

    console.log("Attempt 1: ", attempt1Parse);
    console.log("Attempt 2: ", attempt2Parse);
    console.log("Attempt 3: ", attempt3Parse);
    console.log("Attempt 4: ", attempt4Parse);

    if (didPass && didPass[0] && didPass[0].toLocaleLowerCase() === "pass") {
      return [];
    }
    if (attempt4Parse) {
      return attempt4Parse;
    }

    if (attempt3Parse) {
      return attempt3Parse;
    }

    if (attempt2Parse) {
      return attempt2Parse;
    }

    if (attempt1Parse) {
      console.log("Deduped: ", [...new Set(attempt1Parse)]);
      return [...new Set(attempt1Parse)];
    }
  }

  return [];
}

export function isValidSuggestedBid(
  gameState: GameState,
  suggestedAction: string[]
) {
  const activePlayer = getActivePlayer(gameState);
  const highestBid = getHighestCurrentBid(gameState);
  const activePlayersCurrentBid = getBidValue(activePlayer.currentBid || []);
  const bidToAdd = getBidValue(suggestedAction);

  if (activePlayersCurrentBid + bidToAdd <= highestBid) {
    console.log("Suggested bid that was not higher than highest bid.");
    return false;
  }

  const moneyCards = activePlayer.moneyCards || [];

  for (const card of suggestedAction) {
    if (!moneyCards.includes(card)) {
      console.log(
        `${card} is not in ${JSON.stringify(activePlayer.moneyCards)}`
      );
      return false;
    }
  }

  return true;
}

export async function maybeTakeBotTurn(gameState: GameState) {
  const activePlayer = getActivePlayer(gameState);

  if (!activePlayer.isBot) {
    return false;
  }

  const currentTimestamp = Date.now();

  let suggestedAction: string[] = [];

  try {
    suggestedAction = await generateContent(gameState);
  } catch (e) {
    console.log(e);
  }

  const timeElapsed = Date.now() - currentTimestamp;

  if (timeElapsed < 8000) {
    await wait(8000 - timeElapsed);
  }

  if (suggestedAction.length) {
    const isValidAction = isValidSuggestedBid(gameState, suggestedAction);
    if (!isValidAction) {
      suggestedAction = [];
    }
  }

  if (suggestedAction.length) {
    updatePlayerLastAction(activePlayer);
    updatePlayersBid(activePlayer, suggestedAction);
    updateNextActivePlayer(gameState);

    const totalBid = suggestedAction.reduce(
      (sum: number, current) => Number(sum) + Number(current),
      0
    );

    const notification: Notification = {
      timestamp: Date.now(),
      title: `${activePlayer.email} has highest bid of ${totalBid}.`,
    };

    gameState.public.notification = notification;

    await updateGameState(
      gameState,
      `Player ${activePlayer.email} bid ${suggestedAction.join(",")}`
    );

    return true;
  } else {
    const doesBiddingRoundEndOnFirstPass =
      getDoesBiddingRoundEndOnFirstPass(gameState);

    if (doesBiddingRoundEndOnFirstPass) {
      // The active player is the one who passed.

      // Award the player who passed the currentStatusCard
      // The player who passed current bid is returned to their moneyCards
      // Reset all players current bids
      // Flip a new card from the deck

      const cardAwarded = gameState.public.currentStatusCard;
      const players = gameState.public.players;

      players.forEach((player) => {
        if (player.email === activePlayer.email) {
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
        title: `${activePlayer.email} passes and receives ${cardAwarded}.`,
        message,
      };

      gameState.public.notification = notification;

      return updateGameState(
        gameState,
        `${activePlayer.email} is the first to pass and receives ${cardAwarded}.`
      );
    }

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

      const players = gameState.public.players;

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
        title: `${activePlayer.email} passed.`,
      };

      gameState.public.notification = notification;

      await updateGameState(gameState, `${activePlayer.email} has passed.`);
      return true;
    }
  }
}

export function isActivePlayerBot(gameState: GameState) {
  return getActivePlayer(gameState).isBot;
}
