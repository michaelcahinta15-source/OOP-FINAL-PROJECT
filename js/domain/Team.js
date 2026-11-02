import { Player } from "./Player.js";
import { Coach } from "./Coach.js";

export class Team {
  #id;
  #name;
  #division;
  #coach;
  #roster;

  /** @param {import("./types.js").TeamData} data */
  constructor({ id = crypto.randomUUID(), name, division = "Open", coach = null, roster = [] }) {
    if (!name?.trim()) throw new Error("Team name is required.");
    this.#id = id;
    this.#name = name.trim();
    this.#division = division.trim() || "Open";
    this.#coach = coach ? (coach instanceof Coach ? coach : new Coach(coach)) : null;
    this.#roster = roster.map((player) => player instanceof Player ? player : new Player(player));
    this.#validateRoster();
  }

  get id() { return this.#id; }
  get name() { return this.#name; }
  get division() { return this.#division; }
  get coach() { return this.#coach; }
  get roster() { return [...this.#roster]; }
  rename(name) { if (!name?.trim()) throw new Error("Team name is required."); this.#name = name.trim(); }
  updateDetails({ division, coach }) {
    this.#division = division?.trim() || "Open";
    this.#coach = coach ? new Coach(coach) : null;
  }
  addPlayer(player) {
    const value = player instanceof Player ? player : new Player(player);
    if (this.#roster.some((current) => current.jerseyNumber === value.jerseyNumber)) throw new Error(`Jersey #${value.jerseyNumber} is already in use by this team.`);
    if (this.#roster.some((current) => current.id === value.id)) throw new Error("This player is already on the roster.");
    this.#roster.push(value);
  }
  removePlayer(playerId) { this.#roster = this.#roster.filter((player) => player.id !== playerId); }
  #validateRoster() {
    const numbers = this.#roster.map((player) => player.jerseyNumber);
    if (new Set(numbers).size !== numbers.length) throw new Error("Jersey numbers must be unique within a team.");
  }
  toJSON() {
    return { id: this.#id, name: this.#name, division: this.#division, coach: this.#coach?.toJSON() ?? null, roster: this.#roster.map((player) => player.toJSON()) };
  }
}
