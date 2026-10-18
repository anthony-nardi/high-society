import { GameModule } from "../shared/game";
import { Journey, Railroad, RideTheRailsGameState } from "./types";
import {
  buildRideTheRailsGameState,
  buildTrack,
  endBuild,
  isGameOver,
  ride,
  takeShare,
} from "./helpers/rules";
import { takeBotTurn } from "./helpers/bot";

const rideTheRails: GameModule<RideTheRailsGameState> = {
  name: "ride-the-rails",
  createState: (lobbyUID, players) =>
    buildRideTheRailsGameState(lobbyUID, players),
  actions: {
    takeRideTheRailsShare: (state, payload: { railroad?: Railroad }) =>
      takeShare(state, payload?.railroad as Railroad),
    buildRideTheRailsTrack: (
      state,
      payload: { railroad?: Railroad; hex?: number },
    ) => buildTrack(state, payload?.railroad as Railroad, Number(payload?.hex)),
    endRideTheRailsBuild: (state) => endBuild(state),
    rideTheRails: (state, payload: { journey?: Journey }) =>
      ride(state, payload?.journey as Journey),
  },
  standings: (state) =>
    state.public.players.map((p) => ({ email: p.email, score: p.money })),
  isGameOver,
  botTurn: (state) => takeBotTurn(state),
  botPauseMs: 900,
};

export default rideTheRails;
