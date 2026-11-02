import { Game } from "../domain/Game.js";

export class ScoringService {
  #onFinal;
  constructor(onFinal = () => {}) { this.#onFinal = onFinal; }

  #find(state, gameId) {
    const game = state.games.find((item) => item.id === gameId);
    if (!game) throw new Error("Game not found.");
    return game;
  }
  recordEvent(state, gameId, event) {
    const game = new Game(this.#find(state, gameId));
    game.addEvent(event);
    Object.assign(this.#find(state, gameId), game.toJSON());
  }
  undoLastEvent(state, gameId) {
    const game = new Game(this.#find(state, gameId));
    game.undoLastEvent();
    Object.assign(this.#find(state, gameId), game.toJSON());
  }
  finalize(state, gameId) {
    const game = new Game(this.#find(state, gameId));
    game.finalize();
    Object.assign(this.#find(state, gameId), game.toJSON());
    this.#onFinal(game);
  }
  reopen(state, gameId) {
    const game = new Game(this.#find(state, gameId));
    game.reopen();
    Object.assign(this.#find(state, gameId), game.toJSON());
  }
}
