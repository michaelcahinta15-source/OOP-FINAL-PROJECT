import { GameFormat } from "./GameFormat.js";

export class SingleEliminationFormat extends GameFormat {
  /** @param {import("./types.js").TeamData[]} teams */
  generateSchedule(teams) {
    const shuffled = [...teams];
    const bracketSize = 2 ** Math.ceil(Math.log2(Math.max(2, shuffled.length)));
    const firstRoundGames = shuffled.length - bracketSize / 2;
    const games = [];
    for (let index = 0; index < firstRoundGames; index += 1) {
      games.push({ homeTeamId: shuffled[index * 2].id, awayTeamId: shuffled[index * 2 + 1].id, round: 1 });
    }
    return games;
  }
  /** @param {import("./types.js").GameData[]} completedGames */
  getNextRound(completedGames) {
    return Math.max(1, ...completedGames.map((game) => game.round ?? 1)) + 1;
  }
}
