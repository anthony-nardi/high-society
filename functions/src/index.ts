import { initializeApp } from "firebase-admin/app";
import { bid, passturn } from "./high-society/client";
import {
  addbot,
  createlobby,
  joinlobby,
  readyup,
  removebot,
} from "./shared/client";
import { placeChipOnActiveCard, takeActiveCard } from "./no-thanks/client";

initializeApp();

// Generic
exports.createlobby = createlobby;
exports.joinlobby = joinlobby;
exports.addbot = addbot;
exports.removebot = removebot;
exports.readyup = readyup;

// High Society
exports.bid = bid;
exports.passturn = passturn;

// No Thanks!
exports.takeActiveCard = takeActiveCard;
exports.placeChipOnActiveCard = placeChipOnActiveCard;
