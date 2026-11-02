export class Person {
  #id;
  #firstName;
  #lastName;

  /** @param {import("./types.js").PersonData} data */
  constructor({ id = crypto.randomUUID(), firstName, lastName }) {
    if (!firstName?.trim() || !lastName?.trim()) throw new Error("Enter a first and last name.");
    this.#id = id;
    this.#firstName = firstName.trim();
    this.#lastName = lastName.trim();
  }

  get id() { return this.#id; }
  get firstName() { return this.#firstName; }
  get lastName() { return this.#lastName; }
  get fullName() { return `${this.#firstName} ${this.#lastName}`; }
  getRole() { throw new Error("Person.getRole() must be implemented by a subclass."); }
  toJSON() { return { id: this.#id, firstName: this.#firstName, lastName: this.#lastName }; }
}
