export class Venue {
  #id;
  #name;
  #address;

  constructor({ id = crypto.randomUUID(), name, address = "" }) {
    if (!name?.trim()) throw new Error("Venue name is required.");
    this.#id = id;
    this.#name = name.trim();
    this.#address = address.trim();
  }
  get id() { return this.#id; }
  get name() { return this.#name; }
  get address() { return this.#address; }
  toJSON() { return { id: this.#id, name: this.#name, address: this.#address }; }
}
