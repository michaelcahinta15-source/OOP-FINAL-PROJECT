import { escapeHtml, pageHeader, teamName, formatDate } from "./html.js";

export function renderDashboard(state, standings, canManage = true) {
  const nextGames = state.games.filter((game) => game.status !== "FINAL")
    .sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)).slice(0, 3);
  const finals = state.games.filter((game) => game.status === "FINAL").length;
  const leader = standings[0];
  return `${pageHeader(state.tournament.name, "Your tournament at a glance.", canManage ? `<a class="button button-primary" href="#teams">＋ Add a team</a>` : "")}
    <div class="stats-grid">
      <article class="stat-card"><span>Teams</span><strong>${state.teams.length}</strong><small>Across ${new Set(state.teams.map((team) => team.division)).size} divisions</small></article>
      <article class="stat-card"><span>Games played</span><strong>${finals}</strong><small>${state.games.length} games scheduled</small></article>
      <article class="stat-card"><span>Format</span><strong class="stat-text">${state.tournament.format === "SINGLE_ELIMINATION" ? "Knockout" : "Round robin"}</strong><small>${state.tournament.status === "COMPLETE" ? "Tournament complete" : state.tournament.status === "SETUP" ? "Tournament setup" : "In progress"}</small></article>
      <article class="stat-card"><span>Current leader</span><strong class="stat-text">${leader ? escapeHtml(leader.team.name) : "—"}</strong><small>${leader ? `${leader.wins} wins · ${leader.losses} losses` : "Standings appear after games"}</small></article>
    </div>
    <div class="content-grid dashboard-grid">
      <section class="panel"><div class="panel-heading"><div><h2>Upcoming games</h2><p>Your next matchups</p></div><a class="text-link" href="#schedule">Full schedule →</a></div>
        ${nextGames.length ? `<div class="game-list">${nextGames.map((game) => `<a class="upcoming-game" href="#game-${escapeHtml(game.id)}"><span class="game-time">${formatDate(game.scheduledAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><strong>${teamName(state, game.homeTeamId)} <span>vs</span> ${teamName(state, game.awayTeamId)}</strong><small>${escapeHtml(game.court || "Court TBD")}</small></a>`).join("")}</div>` : `<div class="empty-state"><span class="empty-icon">◷</span><strong>No upcoming games</strong><p>Build your schedule to see matchups here.</p><a class="button button-secondary" href="#schedule">Open schedule</a></div>`}
      </section>
      <section class="panel"><div class="panel-heading"><div><h2>Leaderboard</h2><p>Top teams by record</p></div><a class="text-link" href="#standings">Standings →</a></div>
        ${standings.length ? `<div class="leader-list">${standings.slice(0, 4).map((standing) => `<div class="leader-row"><span class="rank-badge">${standing.rank}</span><strong>${escapeHtml(standing.team.name)}</strong><span>${standing.wins}-${standing.losses}</span></div>`).join("")}</div>` : `<div class="empty-state compact"><span class="empty-icon">↗</span><strong>Standings are warming up</strong><p>Finish a game to see team records.</p></div>`}
      </section>
    </div>`;
}
