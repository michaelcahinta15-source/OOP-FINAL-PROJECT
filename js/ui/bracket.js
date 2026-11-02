import { pageHeader, teamName } from "./html.js";

export function renderBracket(state) {
  const games = state.games.filter((game) => game.round);
  if (state.tournament.format !== "SINGLE_ELIMINATION") {
    return `${pageHeader("Bracket", "Follow each matchup on the road to the championship.")}<div class="panel empty-state"><span class="empty-icon">⌘</span><strong>Round robin selected</strong><p>Switch to Single Elimination and generate the schedule to build a knockout bracket.</p><a class="button button-secondary" href="#schedule">Open schedule</a></div>`;
  }
  if (!games.length) {
    return `${pageHeader("Bracket", "Follow each matchup on the road to the championship.")}<div class="panel empty-state"><span class="empty-icon">⌘</span><strong>Bracket is waiting for teams</strong><p>Add at least two teams and generate a Single Elimination schedule.</p><a class="button button-secondary" href="#schedule">Build the bracket</a></div>`;
  }
  const rounds = new Map();
  for (const game of [...games].sort((a, b) => a.round - b.round)) rounds.set(game.round, [...(rounds.get(game.round) ?? []), game]);
  const finalWinner = games.find((game) => game.status === "FINAL" && game.round === Math.max(...games.map((item) => item.round)));
  return `${pageHeader("Championship bracket", "Winners advance automatically after the game is finalized.", `<span class="count-pill">${games.length} games</span>`)}
    ${finalWinner ? `<div class="champion-banner">🏆 Champion: <strong>${teamName(state, finalWinner.winnerTeamId)}</strong></div>` : ""}
    ${state.settings.bracketByes?.length ? `<div class="notice-banner">Advancing byes: ${state.settings.bracketByes.map((teamId) => teamName(state, teamId)).join(", ")}</div>` : ""}
    <div class="bracket-scroll"><div class="bracket">${[...rounds].map(([round, roundGames]) => `<section class="bracket-round"><h2>${roundGames.length === 1 ? "Final" : roundGames.length === 2 ? "Semi-finals" : `Round ${round}`}</h2>
      ${roundGames.map((game) => `<a class="bracket-game ${escapeHtml(game.status.toLowerCase())}" href="#game-${escapeHtml(game.id)}"><div class="${game.winnerTeamId === game.homeTeamId ? "winner" : ""}">${teamName(state, game.homeTeamId)}<b>${game.status === "SCHEDULED" ? "—" : game.homeScore}</b></div><div class="${game.winnerTeamId === game.awayTeamId ? "winner" : ""}">${teamName(state, game.awayTeamId)}<b>${game.status === "SCHEDULED" ? "—" : game.awayScore}</b></div><small>${escapeHtml(game.status === "FINAL" ? "FINAL" : game.status)}</small></a>`).join("")}
      </section>`).join("")}</div></div>`;
}
