import { Game } from "../domain/Game.js";
import { GameFormatFactory } from "../domain/GameFormatFactory.js";

export class SchedulingService {
  generate(state, format) {
    if (state.teams.length < 2) throw new Error("Add at least two teams before generating a schedule.");
    const hasLiveGames = state.games.some((game) => game.status === "LIVE");
    const hasMixedFinals = state.games.some((game) => game.status === "FINAL")
      && state.games.some((game) => game.status !== "FINAL");
    if (hasLiveGames || hasMixedFinals) throw new Error("Finish or reopen the current games before generating a new schedule.");
    const strategy = GameFormatFactory.create(format);
    const gamesPerRound = new Map();
    const startTime = Date.now();
    const initial = strategy.generateSchedule(state.teams).map((match) => {
      const roundGameIndex = gamesPerRound.get(match.round) ?? 0;
      gamesPerRound.set(match.round, roundGameIndex + 1);
      return new Game({
        ...match,
        scheduledAt: new Date(startTime + (match.round - 1) * 24 * 60 * 60 * 1000).toISOString(),
        court: `Court ${roundGameIndex + 1}`,
      }).toJSON();
    });
    state.tournament.format = format;
    state.games = initial;
    state.settings.bracketByes = format === "SINGLE_ELIMINATION"
      ? state.teams.filter((team) => !initial.some((game) => [game.homeTeamId, game.awayTeamId].includes(team.id))).map((team) => team.id)
      : [];
    return initial;
  }

  updateGame(state, gameId, { scheduledAt, court }) {
    const game = state.games.find((item) => item.id === gameId);
    if (!game) throw new Error("Game not found.");
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) throw new Error("Choose a valid game date and time.");
    if (!court?.trim()) throw new Error("Court name is required.");
    const domainGame = new Game(game);
    domainGame.updateSchedule({ scheduledAt, court: court.trim() });
    const next = domainGame.toJSON();
    const conflict = state.games.find((other) => other.id !== gameId
      && other.status !== "FINAL"
      && other.scheduledAt === next.scheduledAt
      && [other.homeTeamId, other.awayTeamId].some((id) => [next.homeTeamId, next.awayTeamId].includes(id)));
    if (conflict) throw new Error("Schedule conflict: a team already has a game in that time slot.");
    Object.assign(game, next);
  }

  advanceBracket(state) {
    if (state.tournament.format !== "SINGLE_ELIMINATION" || state.games.length === 0) return;
    const latestRound = Math.max(...state.games.map((game) => game.round));
    const roundGames = state.games.filter((game) => game.round === latestRound);
    if (roundGames.some((game) => game.status !== "FINAL")) return;
    const winners = roundGames.map((game) => game.winnerTeamId).filter(Boolean);
    const participants = [...winners, ...(state.settings.bracketByes ?? [])];
    if (participants.length <= 1) return;
    const nextByes = participants.length % 2 ? [participants.at(-1)] : [];
    const matches = [];
    for (let index = 0; index + 1 < participants.length - (participants.length % 2); index += 2) {
      matches.push(new Game({
        homeTeamId: participants[index],
        awayTeamId: participants[index + 1],
        round: latestRound + 1,
        scheduledAt: new Date(Date.now() + (latestRound + index + 1) * 2 * 60 * 60 * 1000).toISOString(),
        court: `Court ${index % 2 + 1}`,
      }).toJSON());
    }
    if (matches.length) state.games.push(...matches);
    state.settings.bracketByes = nextByes;
  }

  findConflicts(games) {
    const conflicts = [];
    for (let i = 0; i < games.length; i += 1) {
      for (let j = i + 1; j < games.length; j += 1) {
        const a = games[i];
        const b = games[j];
        if (a.status !== "FINAL" && b.status !== "FINAL" && a.scheduledAt === b.scheduledAt
          && [a.homeTeamId, a.awayTeamId].some((id) => [b.homeTeamId, b.awayTeamId].includes(id))) conflicts.push([a, b]);
      }
    }
    return conflicts;
  }
}
