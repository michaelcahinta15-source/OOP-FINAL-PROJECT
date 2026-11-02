import { Tiebreaker } from "./Tiebreaker.js";
export class PointsForTiebreaker extends Tiebreaker {
  /** @inheritdoc */
  compare(teamA, teamB) { return teamB.pointsFor - teamA.pointsFor; }
}
