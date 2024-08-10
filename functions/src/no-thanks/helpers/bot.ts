import { VertexAI } from "@google-cloud/vertexai";
import { NoThanksGameState, NoThanksPlayerState } from "../types";
import {
  getActivePlayer,
  isGameOver,
  updateActivePlayer,
  updatePlayersGameStateWithPlaceChip,
  updatePlayersGameStateWithTakeActiveCard,
} from ".";
import { wait } from "../../high-society/helpers";
import { Notification } from "../../shared/types";
import { updateGameState } from "../../shared/helpers";

const project = "high-society-c4ff4";
const location = "us-central1";
const textModel = "gemini-1.0-pro"; // "gemini-1.0-pro";

const GAME_RULES_AND_STRATEGIES_PROMPT = `
## The Card Game:

**Goal:** Be the player with the lowest score.

**Setup:**

* **Deck:**  The deck contains 33 cards numbered from 3-35:
    * 9 cards are removed randomly
    * The deck is placed face down to form a stack.
* **Chips:** Each player starts with 11 chips in a 3-5 player game, 9 chips in a 6 player game, and 7 chips in a 7 player game.

**Gameplay:**
1. The game starts by flipping over the top card of the deck to reveal it, then the starting player decides:
2. **Place a chip:** The active player may place 1 chip from their supply onto the revealed card, or
3. **Taking the card:**  The active player takes the revealed card and any chips placed on it.

If you don't take the card, the player on your left must make the same
choice: take the card or put a counter onto it. This continues until a
player takes the card, and all of the counters on it. Sometimes (typically
with cards that have high numbers), play will go around and around.
You'll get multiple chances to put a counter onto the card before you or
someone else takes it. When you take a card, put it face-up in front of you
on the table and add the counters on the card to your supply of counters.

Every time you take a card, re-start play by flipping over the top card from
the stack. You can then either take that card or put a counter onto it. If
you keep taking cards, your turn continues and you flip over additional
cards. As soon as you put a counter onto a card instead of taking it, play
passes to the player on your left to decide whether to take the card or put
a counter onto it.

When you don't have any counters left, you must take the card.

If you take cards with consecutive numbers, only the lowest number
in the series will count against you. A series can be made up of as
few as two cards. When you collect cards that form a series, place
them face-up so that they overlap, but so that players can still see the
numbers in the corners of the cards.

**Scoring:**
Each card is worth the number of points shown on the card (but
remember, points are bad!). Counters are good, each one cancels out
one point from a card at the end of the game.

**Winning:** 

The game ends when the stack is gone and there are no cards left to
collect. Add up the points on all the cards you took (only count the
lowest card in a series), then subtract the number of counters you have.
The player with the lowest total wins

**Strategies:**

1. It's a good idea to try to hold onto counters. They help your score at
the end of the game and they keep you from taking cards you don't
want to take when you run out of counters.

2. If a card that you need for a series has a high number, you may want
to let it go around a few times before you take it so that the other
players put counters onto it before you take it. Even if one of the
other players takes it, s/he may be adding a lot of points to his/her
score (which helps you)

3. Pay attention to which players are running low on counters. They
may be forced to take a card that you want when they run out.
`;

const vertexAI = new VertexAI({ project: project, location: location });

// Instantiate Gemini models
const generativeModel = vertexAI.getGenerativeModel({
  model: textModel,
});

function buildGameStatePrompt(gameState: NoThanksGameState) {
  const activePlayer = getActivePlayer(gameState);
  const activeCard = gameState.public.activeCard;
  const chipsPlaced = gameState.public.chipsPlaced;
  const activePlayersRemainingChips = activePlayer?.chips;
  const activePlayersCurrentCards = activePlayer?.cards || [];

  let prompt = GAME_RULES_AND_STRATEGIES_PROMPT;

  prompt += `Total players: ${gameState.public.players.length}`;

  let gameStatePromptAddition = "";

  gameStatePromptAddition += `The active card: ${activeCard}\n`;
  gameStatePromptAddition += `Chips placed on the card: ${chipsPlaced}.\n`;
  gameStatePromptAddition += `Your remaining chips: ${JSON.stringify(
    activePlayersRemainingChips
  )}.\n`;
  gameStatePromptAddition += `Your current cards: ${JSON.stringify(
    activePlayersCurrentCards
  )}.\n`;

  gameStatePromptAddition +=
    "Make the optimal move given the following game state.\n";
  gameStatePromptAddition +=
    "Remember, cards are positive points and you want the fewest points possible.\n";
  gameStatePromptAddition += `Your response must be either a "1" or "0" only. Do not offer any explaination, just a simple "1" or "0". Return a "1" if placing a chip to avoid taking the card. Return a "0" if taking the ${activeCard} card and ${chipsPlaced} chips.\n`;
  gameStatePromptAddition +=
    "Remember, points are bad. Try avoiding taking a card if you can't form an immediate sequence with it unless its a low card.";

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

function extractActionFromResponse(str: string): 1 | 0 {
  const regex = /\d+/g;
  const numbers = str.match(regex);

  if (numbers && numbers.includes("1")) {
    return 1;
  } else {
    return 0;
  }
}

export async function generateContent(
  gameState: NoThanksGameState
): Promise<1 | 0> {
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

    const attempt1Parse = extractActionFromResponse(text);

    console.log("Attempt 1: ", attempt1Parse);

    return attempt1Parse;
  }

  return 0;
}

export function isValidAction(
  gameState: NoThanksGameState,
  suggestedAction: 1 | 0
) {
  const activePlayer = getActivePlayer(gameState);
  const activePlayerChips = activePlayer?.chips || 0;

  if (suggestedAction === 1 && activePlayerChips < 1) {
    return false;
  }
  return true;
}

export async function maybeTakeBotTurn(gameState: NoThanksGameState) {
  const activePlayer = getActivePlayer(gameState);

  if (!activePlayer?.isBot) {
    return;
  }

  const currentTimestamp = Date.now();

  let suggestedAction: 0 | 1 = 0;

  try {
    suggestedAction = await generateContent(gameState);
  } catch (e) {
    console.log(e);
  }

  const timeElapsed = Date.now() - currentTimestamp;

  if (timeElapsed < 8000) {
    await wait(8000 - timeElapsed);
  }

  if (!isValidAction(gameState, suggestedAction)) {
    suggestedAction = 0;
  }

  if (suggestedAction === 0) {
    await updateGameStateWithTakingCardAction(gameState, activePlayer);
  } else {
    await updateGameStateWithPlacingChipAction(gameState, activePlayer);
  }
}

export function isActivePlayerBot(gameState: NoThanksGameState) {
  return getActivePlayer(gameState)?.isBot;
}

export async function updateGameStateWithTakingCardAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const activeCard = gameState.public.activeCard;
  const chipsPlaced = gameState.public.chipsPlaced;

  await updatePlayersGameStateWithTakeActiveCard(gameState, activePlayer);

  if (isGameOver(gameState)) {
    gameState.public.status = "GAME_OVER";
  }

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has taken the ${activeCard} along with ${chipsPlaced} chips.`,
  };

  gameState.public.notification = notification;

  await updateGameState(gameState, notification.title);
}

export async function updateGameStateWithPlacingChipAction(
  gameState: NoThanksGameState,
  activePlayer: NoThanksPlayerState
) {
  const activeCard = gameState.public.activeCard;

  await updatePlayersGameStateWithPlaceChip(gameState, activePlayer);

  updateActivePlayer(gameState);

  const notification: Notification = {
    timestamp: Date.now(),
    title: `${activePlayer.email} has placed a chip on the ${activeCard}.`,
  };

  gameState.public.notification = notification;

  await updateGameState(gameState, notification.title);
}
