import { GameEvent } from "./GameEvent.js";

const STATUSES = new Set(["SCHEDULED", "LIVE", "FINAL"]);

export class Game {
  #id;
  #homeTeamId;
  #awayTeamId;
  #scheduledAt;
  #court;
  #status;
  #events;
  #round;
  #winnerTeamId;

  /** @param {import("./types.js").GameData} data */
  constructor({ id = crypto.randomUUID(), homeTeamId, awayTeamId, scheduledAt = "", court = "", status = "SCHEDULED", events = [], round = 1, winnerTeamId = "" }) {
    if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) throw new Error("A game must have two different teams.");
    if (!STATUSES.has(status)) throw new Error("Choose a valid game status.");
    this.#id = id;
    this.#homeTeamId = homeTeamId;
    this.#awayTeamId = awayTeamId;
    this.#scheduledAt = scheduledAt;
    this.#court = court;
    this.#status = status;
    this.#events = events.map((event) => event instanceof GameEvent ? event : new GameEvent(event));
    this.#round = round;
    this.#winnerTeamId = winnerTeamId;
  }

  get id() { return this.#id; }
  get homeTeamId() { return this.#homeTeamId; }
  get awayTeamId() { return this.#awayTeamId; }
  get scheduledAt() { return this.#scheduledAt; }
  get court() { return this.#court; }
  get status() { return this.#status; }
  get events() { return [...this.#events]; }
  get round() { return this.#round; }
  get winnerTeamId() { return this.#winnerTeamId; }
  get homeScore() { return this.#events.reduce((sum, event) => sum + (event.teamId === this.#homeTeamId ? event.points : 0), 0); }
  get awayScore() { return this.#events.reduce((sum, event) => sum + (event.teamId === this.#awayTeamId ? event.points : 0), 0); }

  updateSchedule({ scheduledAt, court }) {
    if (this.#status === "FINAL") throw new Error("Reopen the final game before editing it.");
    this.#scheduledAt = scheduledAt;
    this.#court = court;
  }
  start() {
    if (this.#status === "FINAL") throw new Error("Reopen this game before starting it.");
    this.#status = "LIVE";
  }
  addEvent(event) {
    if (this.#status === "FINAL") throw new Error("Reopen the final game before editing it.");
    const gameEvent = event instanceof GameEvent ? event : new GameEvent(event);
    if (![this.#homeTeamId, this.#awayTeamId].includes(gameEvent.teamId)) throw new Error("The event team must be playing in this game.");
    this.#events.push(gameEvent);
    this.#status = "LIVE";
    return gameEvent;
  }
  undoLastEvent() {
    if (this.#status === "FINAL") throw new Error("Reopen the final game before editing it.");
    return this.#events.pop() ?? null;
  }
  finalize() {
    if (this.#status === "FINAL") throw new Error("This game is already final.");
    if (this.homeScore === this.awayScore) throw new Error("A game cannot end in a tie. Record the deciding points first.");
    this.#status = "FINAL";
    this.#winnerTeamId = this.homeScore > this.awayScore ? this.#homeTeamId : this.#awayTeamId;
  }
  reopen() {
    if (this.#status !== "FINAL") throw new Error("Only a final game can be reopened.");
    this.#status = "LIVE";
    this.#winnerTeamId = "";
  }
  toJSON() {
    return { id: this.#id, homeTeamId: this.#homeTeamId, awayTeamId: this.#awayTeamId, scheduledAt: this.#scheduledAt, court: this.#court, status: this.#status, events: this.#events.map((event) => event.toJSON()), homeScore: this.homeScore, awayScore: this.awayScore, round: this.#round, winnerTeamId: this.#winnerTeamId };
  }
}
