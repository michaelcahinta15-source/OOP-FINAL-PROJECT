export class Standing {
  #team;
  #wins;
  #losses;
  #pointsFor;
  #pointsAgainst;
  #pointDiff;
  #winPct;
  #streak;
  #rank;
  #teamId;

  /** @param {{ team: import("./types.js").TeamData, wins?: number, losses?: number, pointsFor?: number, pointsAgainst?: number, streak?: string }} data */
  constructor({ team, wins = 0, losses = 0, pointsFor = 0, pointsAgainst = 0, streak = "" }) {
    this.#team = team;
    this.#wins = wins;
    this.#losses = losses;
    this.#pointsFor = pointsFor;
    this.#pointsAgainst = pointsAgainst;
    this.#pointDiff = pointsFor - pointsAgainst;
    this.#winPct = wins + losses === 0 ? 0 : wins / (wins + losses);
    this.#streak = streak;
    this.#rank = 0;
    this.#teamId = team.id;
  }

  get team() { return this.#team; }
  get wins() { return this.#wins; }
  get losses() { return this.#losses; }
  get pointsFor() { return this.#pointsFor; }
  get pointsAgainst() { return this.#pointsAgainst; }
  get pointDiff() { return this.#pointDiff; }
  get winPct() { return this.#winPct; }
  get streak() { return this.#streak; }
  get rank() { return this.#rank; }
  get teamId() { return this.#teamId; }
  setRank(rank) { this.#rank = rank; }
}
