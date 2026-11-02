import { Person } from "./Person.js";

export class Referee extends Person {
  #certification;
  constructor({ certification = "Local", ...person }) { super(person); this.#certification = certification; }
  get certification() { return this.#certification; }
  getRole() { return "Referee"; }
  toJSON() { return { ...super.toJSON(), certification: this.#certification }; }
}
