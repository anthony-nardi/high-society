import { initializeApp } from "firebase-admin/app";
import { bid, passturn } from "./high-society/client";
import {
  addbot,
  createlobby,
  joinlobby,
  playbots,
  readyup,
  removebot,
} from "./shared/client";
import { placeChipOnActiveCard, takeActiveCard } from "./no-thanks/client";
import {
  bidOnLoot,
  initiateAuction,
  passOnLoot,
  revealCard,
  useThief,
} from "./razzia/client";
import { drawChip, stopTurn } from "./family-inc/client";
import { captureMarble, placeMarble, removeRing } from "./zertz/client";
import {
  moveYinshRing,
  placeYinshRing,
  removeYinshRing,
  removeYinshRow,
} from "./yinsh/client";
import { moveDvonnStack, placeDvonnPiece } from "./dvonn/client";
import { pushGipfPiece, removeGipfRow } from "./gipf/client";
import { claimLyngkColour, moveLyngkStack } from "./lyngk/client";
import { bidForSale, passForSale, sellForSale } from "./for-sale/client";

initializeApp();

// Generic
exports.createlobby = createlobby;
exports.joinlobby = joinlobby;
exports.addbot = addbot;
exports.removebot = removebot;
exports.readyup = readyup;
exports.playbots = playbots;

// High Society
exports.bid = bid;
exports.passturn = passturn;

// No Thanks!
exports.takeActiveCard = takeActiveCard;
exports.placeChipOnActiveCard = placeChipOnActiveCard;

// Razzia
exports.revealCard = revealCard;
exports.initiateAuction = initiateAuction;
exports.useThief = useThief;
exports.passOnLoot = passOnLoot;
exports.bidOnLoot = bidOnLoot;

// Family Inc.
exports.drawChip = drawChip;
exports.stopTurn = stopTurn;

// ZÈRTZ
exports.placeMarble = placeMarble;
exports.removeRing = removeRing;
exports.captureMarble = captureMarble;

// YINSH
exports.placeYinshRing = placeYinshRing;
exports.moveYinshRing = moveYinshRing;
exports.removeYinshRow = removeYinshRow;
exports.removeYinshRing = removeYinshRing;

// DVONN
exports.placeDvonnPiece = placeDvonnPiece;
exports.moveDvonnStack = moveDvonnStack;

// GIPF
exports.pushGipfPiece = pushGipfPiece;
exports.removeGipfRow = removeGipfRow;

// LYNGK
exports.claimLyngkColour = claimLyngkColour;
exports.moveLyngkStack = moveLyngkStack;

// For Sale
exports.bidForSale = bidForSale;
exports.passForSale = passForSale;
exports.sellForSale = sellForSale;
