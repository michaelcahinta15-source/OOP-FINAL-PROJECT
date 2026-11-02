import { escapeHtml, formatDate, pageHeader, teamName } from "./html.js";

function dateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function renderSchedule(state, role, conflicts = []) {
  const canEdit = role === "Organizer";
  const games = [...state.games].sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0));
  const conflictIds = new Set(conflicts.flat().map((game) => game.id));
  const rounds = new Map();
  for (const game of games) {
    const round = game.round || 1;
    rounds.set(round, [...(rounds.get(round) ?? []), game]);
  }
  return `${pageHeader("Schedule", "Set the matchups, find a court, and keep the tournament moving.", canEdit ? `<span class="count-pill">${games.length} games</span>` : "")}
    ${canEdit ? `<section class="panel schedule-builder"><div class="panel-heading"><div><h2>Build your schedule</h2><p>Generate matchups from the tournament format.</p></div><span class="panel-step">02 / SCHEDULE</span></div>
      <form class="schedule-form" data-form="generate-schedule"><label>Tournament format<select name="format"><option value="ROUND_ROBIN" ${state.tournament.format === "ROUND_ROBIN" ? "selected" : ""}>Round Robin</option><option value="SINGLE_ELIMINATION" ${state.tournament.format === "SINGLE_ELIMINATION" ? "selected" : ""}>Single Elimination</option></select></label><button class="button button-primary">Generate schedule</button></form>
    </section>` : `<div class="notice-banner">Schedule generation and editing are limited to the Organizer.</div>`}
    ${conflicts.length ? `<div class="alert alert-warning">Schedule conflict detected. A team has overlapping games; edit a game time to resolve it.</div>` : ""}
    ${games.length ? `<div class="schedule-rounds">${[...rounds].map(([round, roundGames]) => `<section class="schedule-round"><div class="round-heading"><span>ROUND ${round}</span><span>${roundGames.length} ${roundGames.length === 1 ? "GAME" : "GAMES"}</span></div>
      ${roundGames.map((game) => `<article class="game-row panel ${conflictIds.has(game.id) ? "has-conflict" : ""}">
        <div class="game-row-main"><div class="game-date">${formatDate(game.scheduledAt, { weekday: "short", month: "short", day: "numeric" })}<small>${formatDate(game.scheduledAt, { hour: "numeric", minute: "2-digit" })}</small></div>
          <div class="matchup"><strong>${teamName(state, game.homeTeamId)}</strong><span class="game-score">${game.status === "FINAL" || game.status === "LIVE" ? `${game.homeScore} – ${game.awayScore}` : "VS"}</span><strong>${teamName(state, game.awayTeamId)}</strong></div>
          <div class="game-meta"><span class="status status-${escapeHtml(game.status.toLowerCase())}">${escapeHtml(game.status)}</span><small>${escapeHtml(game.court || "Court TBD")}</small></div>
          <a class="button ${game.status === "FINAL" ? "button-secondary" : "button-primary"}" href="#game-${escapeHtml(game.id)}">${game.status === "FINAL" ? "Game details" : "Open console"}</a>
        </div>
        ${canEdit && game.status !== "FINAL" ? `<form class="game-edit-form" data-form="edit-game" data-game="${escapeHtml(game.id)}"><label>Date & time<input type="datetime-local" name="scheduledAt" required value="${dateTimeLocal(game.scheduledAt)}"></label><label>Court<input name="court" maxlength="30" value="${escapeHtml(game.court)}" required></label><button class="button button-quiet">Update schedule</button></form>` : ""}
      </article>`).join("")}</section>`).join("")}</div>` : `<div class="panel empty-state"><span class="empty-icon">▤</span><strong>Your schedule is empty</strong><p>Add at least two teams, then generate a round robin or elimination schedule.</p><a class="button button-secondary" href="#teams">Manage teams</a></div>`}`;
}
