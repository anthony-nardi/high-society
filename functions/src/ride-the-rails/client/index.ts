import { defineGameFunctions } from "../../shared/game";
import rideTheRails from "../module";

export const {
  takeRideTheRailsShare,
  buildRideTheRailsTrack,
  endRideTheRailsBuild,
  rideTheRails: rideTheRailsPassenger,
} = defineGameFunctions(rideTheRails);
