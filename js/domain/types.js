/**
 * @typedef {Object} PersonData
 * @property {string} [id]
 * @property {string} firstName
 * @property {string} lastName
 */

/**
 * @typedef {PersonData & { jerseyNumber: number|string, position?: string }} PlayerData
 */

/**
 * @typedef {PersonData & { phone?: string }} CoachData
 */

/**
 * @typedef {Object} GameEventData
 * @property {string} [id]
 * @property {"FG2"|"FG3"|"FT"|"MISS"|"REBOUND"|"ASSIST"|"FOUL"|"TURNOVER"|"TIMEOUT"} type
 * @property {string} [playerId]
 * @property {string} teamId
 * @property {number|string} [period]
 * @property {string} [clock]
 */

/**
 * @typedef {Object} GameData
 * @property {string} [id]
 * @property {string} homeTeamId
 * @property {string} awayTeamId
 * @property {string} [scheduledAt]
 * @property {string} [court]
 * @property {"SCHEDULED"|"LIVE"|"FINAL"} [status]
 * @property {GameEventData[]} [events]
 * @property {number} [round]
 * @property {string} [winnerTeamId]
 */

/**
 * @typedef {Object} TeamData
 * @property {string} [id]
 * @property {string} name
 * @property {string} [division]
 * @property {(PersonData & { phone?: string })|null} [coach]
 * @property {PlayerData[]} [roster]
 */

export {};
