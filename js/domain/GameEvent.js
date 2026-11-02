const TYPES = new Set(["FG2", "FG3", "FT", "MISS", "REBOUND", "ASSIST", "FOUL", "TURNOVER", "TIMEOUT"]);

export class GameEvent {
  #id;
  #type;
  #playerId;
  #teamId;
  #period;
  #clock;
  #createdAt;

  /** @param {import("./types.js").GameEventData} data */
  constructor({ id = crypto.randomUUID(), type, playerId = "", teamId, period = 1, clock = "", createdAt = new Date().toISOString() }) {
    if (!TYPES.has(type)) throw new Error("Select a valid game event.");
    const eventPeriod = Number(period);
    if (!Number.isInteger(eventPeriod) || eventPeriod < 1 || eventPeriod > 10) throw new Error("Period must be a whole number between 1 and 10.");
    this.#id = id;
    this.#type = type;
    this.#playerId = playerId;
    this.#teamId = teamId;
    this.#period = eventPeriod;
    this.#clock = clock;
    this.#createdAt = createdAt;
  }

  get id() { return this.#id; }
  get type() { return this.#type; }
  get playerId() { return this.#playerId; }
  get teamId() { return this.#teamId; }
  get period() { return this.#period; }
  get clock() { return this.#clock; }
  get points() { return this.#type === "FG2" ? 2 : this.#type === "FG3" ? 3 : this.#type === "FT" ? 1 : 0; }
  toJSON() { return { id: this.#id, type: this.#type, playerId: this.#playerId, teamId: this.#teamId, period: this.#period, clock: this.#clock, createdAt: this.#createdAt }; }
}
