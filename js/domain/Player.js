import { Person } from "./Person.js";

export class Player extends Person {
  #jerseyNumber;
  #position;

  /** @param {import("./types.js").PlayerData} data */
  constructor({ jerseyNumber, position = "Guard", ...person }) {
    super(person);
    const number = Number(jerseyNumber);
    if (!Number.isInteger(number) || number < 0 || number > 99) throw new Error("Jersey number must be between 0 and 99.");
    this.#jerseyNumber = number;
    this.#position = position;
  }

  get jerseyNumber() { return this.#jerseyNumber; }
  get position() { return this.#position; }
  getRole() { return "Player"; }
  toJSON() { return { ...super.toJSON(), jerseyNumber: this.#jerseyNumber, position: this.#position }; }
}
