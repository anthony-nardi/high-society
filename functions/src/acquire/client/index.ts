import { defineGameFunctions } from "../../shared/game";
import acquire from "../module";

export const {
  placeAcquireTile,
  foundAcquireChain,
  chooseAcquireSurvivor,
  disposeAcquireStock,
  buyAcquireStock,
  declareAcquireEnd,
} = defineGameFunctions(acquire);
