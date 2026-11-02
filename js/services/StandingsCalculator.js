import { Standing } from "../domain/Standing.js";
import { HeadToHeadTiebreaker } from "../domain/HeadToHeadTiebreaker.js";
import { PointDifferentialTiebreaker } from "../domain/PointDifferentialTiebreaker.js";
import { PointsForTiebreaker } from "../domain/PointsForTiebreaker.js";
import { WinPercentageTiebreaker } from "../domain/WinPercentageTiebreaker.js";

const TIEBREAKERS = {
  HEAD_TO_HEAD: new HeadToHeadTiebreaker(),
  POINT_DIFFERENTIAL: new PointDifferentialTiebreaker(),
  POINTS_FOR: new PointsForTiebreaker(),
  WIN_PERCENTAGE: new WinPercentageTiebreaker(),
};

export class StandingsCalculator {
  calculate(teams, games, order) {
    const results = teams.map((team) => {
      const finalGames = games.filter((game) => game.status === "FINAL"
        && (game.homeTeamId === team.id || game.awayTeamId === team.id));
      let wins = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      for (const game of finalGames) {
        const home = game.homeTeamId === team.id;
        const scored = home ? game.homeScore : game.awayScore;
        const conceded = home ? game.awayScore : game.homeScore;
        pointsFor += scored;
        pointsAgainst += conceded;
        if (scored > conceded) wins += 1;
        else losses += 1;
      }
      const recent = [...finalGames].sort((a, b) => new Date(b.scheduledAt || 0) - new Date(a.scheduledAt || 0)).slice(0, 5);
      const streak = recent.map((game) => {
        const won = game.winnerTeamId ? game.winnerTeamId === team.id
          : (game.homeTeamId === team.id ? game.homeScore > game.awayScore : game.awayScore > game.homeScore);
        return won ? "W" : "L";
      }).join("");
      return new Standing({ team, wins, losses, pointsFor, pointsAgainst, streak });
    });

    const tiebreakers = order.map((key) => TIEBREAKERS[key]).filter(Boolean);
    results.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      for (const tiebreaker of tiebreakers) {
        const compared = tiebreaker.compare(a, b, { games });
        if (compared !== 0) return compared;
      }
      return a.team.name.localeCompare(b.team.name);
    });
    const divisions = new Map();
    for (const standing of results) {
      const division = standing.team.division;
      divisions.set(division, [...(divisions.get(division) ?? []), standing]);
    }
    for (const divisionStandings of divisions.values()) {
      divisionStandings.forEach((standing, index) => standing.setRank(index + 1));
    }
    return results;
  }
}
