import { defineGameFunctions } from "../../shared/game";
import yinsh from "../module";

export const {
  placeYinshRing,
  moveYinshRing,
  removeYinshRow,
  removeYinshRing,
} = defineGameFunctions(yinsh);
