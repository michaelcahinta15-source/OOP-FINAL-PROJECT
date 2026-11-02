export class Tiebreaker {
  /**
   * @param {import("./Standing.js").Standing} teamA
   * @param {import("./Standing.js").Standing} teamB
   * @param {{ games: import("./types.js").GameData[] }} context
   * @returns {number}
   */
  compare(teamA, teamB, context) {
    throw new Error("Tiebreaker.compare() must be implemented.");
  }
}
