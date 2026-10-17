import { defineGameFunctions } from "../../shared/game";
import forSale from "../module";

export const { bidForSale, passForSale, sellForSale } =
  defineGameFunctions(forSale);
