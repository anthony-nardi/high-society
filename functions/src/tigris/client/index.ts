import { defineGameFunctions } from "../../shared/game";
import tigris from "../module";

export const {
  placeTigrisTile,
  positionTigrisLeader,
  withdrawTigrisLeader,
  playTigrisCatastrophe,
  replaceTigrisTiles,
  endTigrisTurn,
  commitTigrisTiles,
  chooseTigrisWar,
  buildTigrisMonument,
  skipTigrisMonument,
  takeTigrisTreasure,
} = defineGameFunctions(tigris);
