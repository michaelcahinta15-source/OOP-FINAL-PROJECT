import { Tiebreaker } from "./Tiebreaker.js";

export class HeadToHeadTiebreaker extends Tiebreaker {
  /** @inheritdoc */
  compare(teamA, teamB, context) {
    const game = context.games.find((item) => item.status === "FINAL"
      && [item.homeTeamId, item.awayTeamId].includes(teamA.teamId)
      && [item.homeTeamId, item.awayTeamId].includes(teamB.teamId));
    if (!game) return 0;
    const scoreA = game.homeTeamId === teamA.teamId ? game.homeScore : game.awayScore;
    const scoreB = game.homeTeamId === teamB.teamId ? game.homeScore : game.awayScore;
    return scoreB - scoreA;
  }
}
