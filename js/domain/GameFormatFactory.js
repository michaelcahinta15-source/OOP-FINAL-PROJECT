import { RoundRobinFormat } from "./RoundRobinFormat.js";
import { SingleEliminationFormat } from "./SingleEliminationFormat.js";

export class GameFormatFactory {
  static create(type) {
    if (type === "SINGLE_ELIMINATION") return new SingleEliminationFormat();
    if (type === "ROUND_ROBIN") return new RoundRobinFormat();
    throw new Error(`Unknown game format: ${type}`);
  }
}
