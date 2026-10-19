import { defineGameFunctions } from "../../shared/game";
import medici from "../module";

export const { drawMediciCard, offerMediciLot, bidMedici, passMedici } =
  defineGameFunctions(medici);
