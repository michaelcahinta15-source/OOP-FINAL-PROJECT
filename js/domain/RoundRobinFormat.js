import { GameFormat } from "./GameFormat.js";

export class RoundRobinFormat extends GameFormat {
  /** @param {import("./types.js").TeamData[]} teams */
  generateSchedule(teams) {
    const games = [];
    const participants = [...teams];
    if (participants.length % 2) participants.push(null);
    const total = participants.length;
    for (let round = 1; round < total; round += 1) {
      for (let pair = 0; pair < total / 2; pair += 1) {
        const home = participants[pair];
        const away = participants[total - pair - 1];
        if (home && away) games.push({ homeTeamId: home.id, awayTeamId: away.id, round });
      }
      const fixed = participants[0];
      const rotation = participants.slice(1);
      rotation.unshift(rotation.pop());
      participants.splice(0, participants.length, fixed, ...rotation);
    }
    return games;
  }
  /** @param {import("./types.js").GameData[]} completedGames */
  getNextRound(completedGames) {
    return Math.max(0, ...completedGames.map((game) => game.round ?? 1)) + 1;
  }
}
