import { defineGameFunctions } from "../../shared/game";
import savanna from "../module";

export const { placeSavannaCard, flipSavannaPrey } =
  defineGameFunctions(savanna);
