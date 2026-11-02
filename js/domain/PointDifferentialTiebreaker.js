import { Tiebreaker } from "./Tiebreaker.js";
export class PointDifferentialTiebreaker extends Tiebreaker {
  /** @inheritdoc */
  compare(teamA, teamB) { return teamB.pointDiff - teamA.pointDiff; }
}
