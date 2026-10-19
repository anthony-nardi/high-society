import { defineGameFunctions } from "../../shared/game";
import push from "../module";

export const { drawPushCard, placePushCard, takePushColumn, bankPushColour } =
  defineGameFunctions(push);
