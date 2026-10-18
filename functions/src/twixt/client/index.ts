import { defineGameFunctions } from "../../shared/game";
import twixt from "../module";

export const { placeTwixtPeg, swapTwixtSides, removeTwixtLink } =
  defineGameFunctions(twixt);
