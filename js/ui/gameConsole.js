import { escapeHtml, pageHeader, teamName } from "./html.js";

const EVENT_LABELS = {
  FG2: "2 points", FG3: "3 points", FT: "Free throw", MISS: "Miss", REBOUND: "Rebound",
  ASSIST: "Assist", FOUL: "Foul", TURNOVER: "Turnover", TIMEOUT: "Timeout",
};

export function renderGameConsole(state, gameId, role) {
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return `${pageHeader("Game console", "Game not found.", `<a class="button button-secondary" href="#schedule">Back to schedule</a>`)}<div class="alert alert-warning">This game no longer exists.</div>`;
  const canScore = ["Organizer", "Referee"].includes(role);
  const players = state.teams.flatMap((team) => team.roster.map((player) => ({ ...player, teamId: team.id })));
  const disabled = !canScore || game.status === "FINAL" ? "disabled" : "";
  const eventRows = [...game.events].reverse().slice(0, 12).map((event) => {
    const player = players.find((item) => item.id === event.playerId);
    return `<div class="event-row"><span class="event-mark ${event.points ? "scoring" : ""}">${event.points ? `+${event.points}` : "•"}</span><span><strong>${escapeHtml(EVENT_LABELS[event.type] ?? event.type)}</strong><small>${escapeHtml(player ? `#${player.jerseyNumber} ${player.firstName} ${player.lastName}` : teamName(state, event.teamId))}</small></span><small>P${event.period} ${escapeHtml(event.clock || "")}</small></div>`;
  }).join("");
  return `${pageHeader("Game console", `${escapeHtml(game.court || "Court TBD")} · ${game.status === "FINAL" ? "Final score recorded" : "Live scorekeeping"}`, `<a class="button button-secondary" href="#schedule">← Schedule</a>`)}
    <section class="scoreboard panel">
      <div class="score-team"><span>HOME</span><strong>${teamName(state, game.homeTeamId)}</strong><b>${game.homeScore}</b></div>
      <div class="score-divider"><span class="status status-${game.status.toLowerCase()}">${game.status}</span><span>—</span></div>
      <div class="score-team"><span>AWAY</span><strong>${teamName(state, game.awayTeamId)}</strong><b>${game.awayScore}</b></div>
    </section>
    ${!canScore ? `<div class="notice-banner">Scoring is available to the Organizer and Referee roles. Switch roles in the top bar to continue.</div>` : ""}
    ${game.status === "FINAL" && canScore ? `<div class="alert alert-success">Final result: ${teamName(state, game.winnerTeamId)} wins. <button class="text-button" data-action="reopen-game" data-game="${escapeHtml(game.id)}">Reopen game</button></div>` : ""}
    <div class="content-grid console-grid">
      <section class="panel"><div class="panel-heading"><div><h2>Record an event</h2><p>Choose the team, then record a play.</p></div><span class="panel-step">LIVE SCORING</span></div>
        <form class="event-controls" data-form="record-event" data-game="${escapeHtml(game.id)}">
          <label>Team<select name="teamId" required><option value="${escapeHtml(game.homeTeamId)}">${teamName(state, game.homeTeamId)}</option><option value="${escapeHtml(game.awayTeamId)}">${teamName(state, game.awayTeamId)}</option></select></label>
          <label>Player<select name="playerId"><option value="">Team event / no player</option>${players.filter((player) => [game.homeTeamId, game.awayTeamId].includes(player.teamId)).map((player) => `<option value="${escapeHtml(player.id)}">#${escapeHtml(player.jerseyNumber)} ${escapeHtml(player.firstName)} ${escapeHtml(player.lastName)}</option>`).join("")}</select></label>
          <div class="event-buttons">${Object.entries(EVENT_LABELS).map(([type, label]) => `<button type="button" class="event-button ${type === "FG2" || type === "FG3" || type === "FT" ? "event-score" : ""}" data-action="record-event" data-event="${type}" data-game="${escapeHtml(game.id)}" ${disabled}>${type === "FG2" ? "+2" : type === "FG3" ? "+3" : type === "FT" ? "+1" : label}</button>`).join("")}</div>
          <div class="form-grid compact-grid"><label>Period<input name="period" type="number" min="1" max="10" value="1"></label><label>Clock<input name="clock" maxlength="8" placeholder="08:42"></label></div>
          <div class="form-actions"><button type="button" class="button button-secondary" data-action="undo-event" data-game="${escapeHtml(game.id)}" ${disabled || !game.events.length ? "disabled" : ""}>↶ Undo last</button>
            ${game.status !== "FINAL" ? `<button type="button" class="button button-primary" data-action="finalize-game" data-game="${escapeHtml(game.id)}" ${!canScore ? "disabled" : ""}>End game · Finalize</button>` : ""}
          </div>
        </form>
      </section>
      <section class="panel"><div class="panel-heading"><div><h2>Play-by-play</h2><p>${game.events.length} recorded events</p></div></div>
        ${eventRows ? `<div class="event-list">${eventRows}</div>` : `<div class="empty-state compact"><span class="empty-icon">◉</span><strong>No events recorded</strong><p>Start scoring to build the play-by-play.</p></div>`}
      </section>
    </div>`;
}
