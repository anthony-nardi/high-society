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
