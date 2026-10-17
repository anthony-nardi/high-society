import { defineGameFunctions } from "../../shared/game";
import razzia from "../module";

export const { revealCard, initiateAuction, useThief, passOnLoot, bidOnLoot } =
  defineGameFunctions(razzia);
