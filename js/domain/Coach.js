import { Person } from "./Person.js";

export class Coach extends Person {
  #phone;
  /** @param {import("./types.js").CoachData} data */
  constructor({ phone = "", ...person }) { super(person); this.#phone = phone; }
  get phone() { return this.#phone; }
  getRole() { return "Coach"; }
  toJSON() { return { ...super.toJSON(), phone: this.#phone }; }
}
