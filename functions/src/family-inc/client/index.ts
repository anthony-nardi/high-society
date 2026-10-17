import { defineGameFunctions } from "../../shared/game";
import familyInc from "../module";

export const { drawChip, stopTurn } = defineGameFunctions(familyInc);
