import admin from "firebase-admin";
import { bid, passturn } from "./high-society/client";
import { addbot, createlobby, joinlobby, readyup } from "./shared/client";
import { takeActiveCard } from "./no-thanks/client";

admin.initializeApp();

// Generic
exports.createlobby = createlobby;
exports.joinlobby = joinlobby;
exports.addbot = addbot;
exports.readyup = readyup;

// High Society
exports.bid = bid;
exports.passturn = passturn;

// No Thanks!
exports.takeActiveCard = takeActiveCard;
