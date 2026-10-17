import { defineGameFunctions } from "../../shared/game";
import zertz from "../module";

export const { placeMarble, removeRing, captureMarble } =
  defineGameFunctions(zertz);
