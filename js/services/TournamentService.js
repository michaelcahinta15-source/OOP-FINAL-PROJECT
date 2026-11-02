import { Team } from "../domain/Team.js";
import { Player } from "../domain/Player.js";
import { Tournament } from "../domain/Tournament.js";

export class TournamentService {
  constructor(state, persist) {
    this.state = state;
    this.persist = persist;
  }

  async updateTournament(input) {
    const tournament = new Tournament(this.state.tournament);
    tournament.update(input);
    this.state.tournament = tournament.toJSON();
    await this.persist();
  }

  async addTeam(input) {
    const coach = this.#coachInput(input.coach);
    const team = new Team({ ...input, coach });
    if (this.state.teams.some((item) => item.name.toLowerCase() === team.name.toLowerCase())) throw new Error("A team with that name already exists.");
    this.state.teams.push(team.toJSON());
    await this.persist();
  }

  async updateTeam(teamId, input) {
    const record = this.state.teams.find((team) => team.id === teamId);
    if (!record) throw new Error("Team not found.");
    if (this.state.teams.some((team) => team.id !== teamId && team.name.toLowerCase() === input.name.trim().toLowerCase())) throw new Error("A team with that name already exists.");
    const team = new Team(record);
    team.rename(input.name);
    team.updateDetails({ division: input.division, coach: this.#coachInput(input.coach) });
    this.state.teams[this.state.teams.indexOf(record)] = team.toJSON();
    await this.persist();
  }

  #coachInput(coach = {}) {
    const firstName = coach.firstName?.trim() ?? "";
    const lastName = coach.lastName?.trim() ?? "";
    if (Boolean(firstName) !== Boolean(lastName)) throw new Error("Enter both coach names, or leave both blank.");
    return firstName ? { ...coach, firstName, lastName } : null;
  }

  async removeTeam(teamId) {
    this.state.teams = this.state.teams.filter((team) => team.id !== teamId);
    if (this.state.tournament.format === "SINGLE_ELIMINATION") {
      this.state.games = [];
      this.state.settings.bracketByes = [];
    } else {
      this.state.games = this.state.games.filter((game) => game.homeTeamId !== teamId && game.awayTeamId !== teamId);
    }
    await this.persist();
  }

  async addPlayer(teamId, input) {
    if (this.state.teams.some((team) => team.roster.some((player) => player.id === input.id))) throw new Error("A player cannot be on two teams.");
    const teamRecord = this.state.teams.find((team) => team.id === teamId);
    if (!teamRecord) throw new Error("Team not found.");
    const team = new Team(teamRecord);
    team.addPlayer(new Player(input));
    teamRecord.roster = team.roster.map((player) => player.toJSON());
    await this.persist();
  }

  async removePlayer(teamId, playerId) {
    const record = this.state.teams.find((team) => team.id === teamId);
    if (!record) throw new Error("Team not found.");
    record.roster = record.roster.filter((player) => player.id !== playerId);
    await this.persist();
  }
}
