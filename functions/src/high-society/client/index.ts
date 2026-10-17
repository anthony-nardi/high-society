import { defineGameFunctions } from "../../shared/game";
import highSociety from "../module";

export const { bid, passturn } = defineGameFunctions(highSociety);
