import { defineGameFunctions } from "../../shared/game";
import noThanks from "../module";

export const { takeActiveCard, placeChipOnActiveCard } =
  defineGameFunctions(noThanks);
