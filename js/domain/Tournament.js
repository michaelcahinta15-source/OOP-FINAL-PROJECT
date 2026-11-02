export class Tournament {
  #name;
  #format;
  #tiebreakerOrder;
  #status;

  /** @param {{ name?: string, format?: string, tiebreakerOrder?: string[], status?: string }} data */
  constructor({ name = "Courtside Invitational", format = "ROUND_ROBIN", tiebreakerOrder = ["HEAD_TO_HEAD", "POINT_DIFFERENTIAL", "POINTS_FOR", "WIN_PERCENTAGE"], status = "SETUP" } = {}) {
    this.#name = name;
    this.#format = format;
    this.#tiebreakerOrder = [...tiebreakerOrder];
    this.#status = status;
  }
  get name() { return this.#name; }
  get format() { return this.#format; }
  get tiebreakerOrder() { return [...this.#tiebreakerOrder]; }
  get status() { return this.#status; }
  update({ name, format, tiebreakerOrder }) {
    if (name?.trim()) this.#name = name.trim();
    if (format) this.#format = format;
    if (tiebreakerOrder) this.#tiebreakerOrder = [...tiebreakerOrder];
  }
  toJSON() { return { name: this.#name, format: this.#format, tiebreakerOrder: [...this.#tiebreakerOrder], status: this.#status }; }
}
