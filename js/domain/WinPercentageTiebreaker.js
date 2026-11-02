import { Tiebreaker } from "./Tiebreaker.js";
export class WinPercentageTiebreaker extends Tiebreaker {
  /** @inheritdoc */
  compare(teamA, teamB) { return teamB.winPct - teamA.winPct; }
}
