import { defineGameFunctions } from "../../shared/game";
import condottiere from "../module";

export const {
  chooseCondottiereBattlefield,
  playCondottiereCard,
  passCondottiere,
} = defineGameFunctions(condottiere);
