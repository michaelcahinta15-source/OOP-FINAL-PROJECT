export class Court {
  #id;
  #name;
  #venue;

  constructor({ id = crypto.randomUUID(), name, venue = "" }) {
    if (!name?.trim()) throw new Error("Court name is required.");
    this.#id = id;
    this.#name = name.trim();
    this.#venue = venue.trim();
  }
  get id() { return this.#id; }
  get name() { return this.#name; }
  get venue() { return this.#venue; }
  toJSON() { return { id: this.#id, name: this.#name, venue: this.#venue }; }
}
