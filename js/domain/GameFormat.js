export class GameFormat {
  /**
   * @param {import("./types.js").TeamData[]} teams
   * @returns {Partial<import("./types.js").GameData>[]}
   */
  generateSchedule(teams) { throw new Error("GameFormat.generateSchedule() must be implemented."); }
  /**
   * @param {import("./types.js").GameData[]} completedGames
   * @returns {number}
   */
  getNextRound(completedGames) { throw new Error("GameFormat.getNextRound() must be implemented."); }
}
